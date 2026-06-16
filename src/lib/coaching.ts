// PadelHub — coaching domain helpers (pure, framework-agnostic).
// Shared by the coaching server actions and the schedule-builder UI so session
// generation + coach-availability rules live in ONE place. No React, no DB.

/** Coach availability for one weekday. */
export interface CoachAvailability {
  /** weekday 0 = Sunday … 6 = Saturday */
  day: number;
  /** does the coach work this day */
  works: boolean;
  /** working window start hour (0–23) */
  start: number;
  /** working window end hour (1–24, exclusive) */
  end: number;
}

/** Build a default 7-day availability (Mon–Sat 09:00–21:00, Sun off). */
export function makeDefaultAvailability(): CoachAvailability[] {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    works: day !== 0,
    start: 9,
    end: 21,
  }));
}

/** Normalize an unknown JSON value into a full 7-entry availability array. */
export function normalizeAvailability(raw: unknown): CoachAvailability[] {
  const base = makeDefaultAvailability();
  if (!Array.isArray(raw)) return base;
  return base.map((def) => {
    const found = (raw as CoachAvailability[]).find((a) => a?.day === def.day);
    if (!found) return def;
    return {
      day: def.day,
      works: Boolean(found.works),
      start: Number.isFinite(found.start) ? found.start : def.start,
      end: Number.isFinite(found.end) ? found.end : def.end,
    };
  });
}

/** The weekly cycle config used to generate sessions. */
/** One weekday + its start time within the weekly cycle. */
export interface CycleSlot {
  /** weekday 0–6 */
  day: number;
  /** session start time "HH:MM" */
  time: string;
}

/** The weekly cycle config used to generate sessions. Each chosen weekday has
 * its OWN start time, so e.g. Wed 13:00 + Fri 14:00 is valid. */
export interface CoachingCycle {
  /** per-weekday slots (day + time). */
  slots: CycleSlot[];
  /** session length in minutes */
  durationMin: number;
}

export const WEEKDAY_LABELS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
export const WEEKDAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** Display order Mon→Sun for weekday pickers. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const pad = (n: number) => String(n).padStart(2, "0");

/** Parse "HH:MM" → minutes since midnight. */
export function timeToMinutes(t: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Local ISO-ish string (no tz shift) for a Date. */
export function localIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:00`;
}

/** A planned (not-yet-persisted) session slot from cycle generation. */
export interface PlannedSlot {
  sequence: number;
  /** local ISO start */
  start: string;
  /** local ISO end */
  end: string;
  /** date key YYYY-MM-DD */
  dateKey: string;
  /** weekday 0–6 */
  day: number;
}

/**
 * Generate `count` session slots starting from `startDate`. Each cycle slot
 * defines a weekday and its own start time (e.g. Wed 13:00, Fri 14:00). Walks
 * forward day-by-day, emitting a slot each time the weekday matches one in the
 * cycle (at that day's specific time), until `count` slots are produced.
 */
export function generateSlots(
  startDate: Date,
  cycle: CoachingCycle,
  count: number,
): PlannedSlot[] {
  const slots: PlannedSlot[] = [];
  if (!cycle.slots.length || count <= 0) return slots;

  // map weekday → time for quick lookup
  const timeByDay = new Map<number, string>();
  cycle.slots.forEach((s) => timeByDay.set(s.day, s.time));

  // begin from the start date at 00:00 local
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  // safety cap to avoid runaway loops (max ~2 years of days)
  let guard = 0;
  const maxDays = 730;

  while (slots.length < count && guard < maxDays) {
    const day = cursor.getDay();
    const time = timeByDay.get(day);
    if (time !== undefined) {
      const startMin = timeToMinutes(time);
      const s = new Date(cursor);
      s.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      const e = new Date(s.getTime() + cycle.durationMin * 60_000);
      slots.push({
        sequence: slots.length + 1,
        start: localIso(s),
        end: localIso(e),
        dateKey: `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`,
        day: s.getDay(),
      });
    }
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return slots;
}

/** Coach availability + busy-window inputs for assignment. */
export interface CoachAvailabilityInput {
  id: string;
  status: string;
  availability: CoachAvailability[];
  /** existing session windows (local ISO start/end) the coach is already booked */
  busy: { start: string; end: string }[];
}

/** Does a coach work and have a free window covering [start, end)? */
export function isCoachAvailable(
  coach: CoachAvailabilityInput,
  startIso: string,
  endIso: string,
): boolean {
  if (coach.status !== "active") return false;
  const start = new Date(startIso);
  const end = new Date(endIso);
  const day = start.getDay();
  const avail = coach.availability.find((a) => a.day === day);
  if (!avail || !avail.works) return false;

  // session must fall within the working window (hours)
  const startHourFloat = start.getHours() + start.getMinutes() / 60;
  const endHourFloat = end.getHours() + end.getMinutes() / 60;
  if (startHourFloat < avail.start || endHourFloat > avail.end) return false;

  // no overlap with an existing booked session
  const s = start.getTime();
  const e = end.getTime();
  for (const b of coach.busy) {
    const bs = new Date(b.start).getTime();
    const be = new Date(b.end).getTime();
    if (s < be && bs < e) return false; // overlap
  }
  return true;
}

/**
 * Pick an available coach for a session, preferring the one with the FEWEST
 * already-assigned sessions (load balancing) so coaching spreads across staff.
 * Mutates each coach's `busy` list when chosen so subsequent slots see it.
 * Returns the chosen coach id, or null when none is available.
 */
export function assignCoachForSlot(
  coaches: CoachAvailabilityInput[],
  startIso: string,
  endIso: string,
): string | null {
  const candidates = coaches.filter((c) => isCoachAvailable(c, startIso, endIso));
  if (!candidates.length) return null;
  // fewest current busy windows first
  candidates.sort((a, b) => a.busy.length - b.busy.length);
  const chosen = candidates[0];
  chosen.busy.push({ start: startIso, end: endIso });
  return chosen.id;
}
