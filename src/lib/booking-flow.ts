export const BOOKING_TIME_ZONE = "Asia/Jakarta";
export const BOOKING_SLOT_MINUTES = 60;
export const STORAGE_SLOT_MINUTES = 30;
export const STORAGE_SLOTS_PER_SESSION =
  BOOKING_SLOT_MINUTES / STORAGE_SLOT_MINUTES;

export type SlotRange = {
  startSlot: number;
  endSlot: number;
};

export type BookingFlowState = {
  selectedDate: Date | null;
  selectedSlotIds: number[];
  selectedCourtId: string | null;
};

export type TimeGroupRange = {
  id: string;
  name: string;
  startHour: number;
  endHour: number;
  color: string;
  sortOrder: number;
};

export type BookingScheduleDay = {
  day: number;
  available: boolean;
  slots: string[];
};

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: string): boolean {
  if (!dateKeyPattern.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function dateKeyInTimeZone(
  date = new Date(),
  timeZone = BOOKING_TIME_ZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function minuteOfDayInTimeZone(
  date = new Date(),
  timeZone = BOOKING_TIME_ZONE,
): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return value("hour") * 60 + value("minute");
}

export function normalizeSelectedSlots(slots: number[]): number[] {
  return [...new Set(slots)]
    .filter(
      (slot) =>
        Number.isInteger(slot) &&
        slot >= 0 &&
        slot + STORAGE_SLOTS_PER_SESSION <= 48,
    )
    .sort((a, b) => a - b);
}

export function areSlotsConsecutive(slots: number[]): boolean {
  const sorted = normalizeSelectedSlots(slots);
  if (sorted.length !== slots.length || sorted.length === 0) return false;
  return sorted.every(
    (slot, index) =>
      index === 0 || slot === sorted[index - 1] + STORAGE_SLOTS_PER_SESSION,
  );
}

export function selectedSlotsToRange(slots: number[]): SlotRange | null {
  const sorted = normalizeSelectedSlots(slots);
  if (!areSlotsConsecutive(sorted)) return null;
  return {
    startSlot: sorted[0],
    endSlot: sorted[sorted.length - 1] + STORAGE_SLOTS_PER_SESSION,
  };
}

export function availabilityRangeForCandidateSlot(
  selectedSlots: number[],
  candidateSlot: number,
): SlotRange | null {
  const normalizedSelected = normalizeSelectedSlots(selectedSlots);
  const normalizedCandidate = normalizeSelectedSlots([candidateSlot]);
  if (normalizedCandidate.length !== 1) return null;
  if (normalizedSelected.length === 0) {
    return {
      startSlot: normalizedCandidate[0],
      endSlot: normalizedCandidate[0] + STORAGE_SLOTS_PER_SESSION,
    };
  }

  const candidateSelection = normalizeSelectedSlots([
    ...normalizedSelected,
    normalizedCandidate[0],
  ]);
  return areSlotsConsecutive(candidateSelection)
    ? selectedSlotsToRange(candidateSelection)
    : {
        startSlot: normalizedCandidate[0],
        endSlot: normalizedCandidate[0] + STORAGE_SLOTS_PER_SESSION,
      };
}

export function slotLabel(slot: number): string {
  const totalMinutes = slot * STORAGE_SLOT_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function localBookingDate(dateKey: string, slot: number): Date {
  const base = new Date(`${dateKey}T00:00:00`);
  base.setMinutes(slot * STORAGE_SLOT_MINUTES);
  return base;
}

export function weekdayForDateKey(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

export function intervalsOverlap(
  existingStart: Date,
  existingEnd: Date,
  selectedStart: Date,
  selectedEnd: Date,
): boolean {
  return existingStart < selectedEnd && existingEnd > selectedStart;
}

export function isSlotPast(
  dateKey: string,
  startSlot: number,
  now = new Date(),
): boolean {
  const today = dateKeyInTimeZone(now);
  if (dateKey < today) return true;
  if (dateKey > today) return false;
  return startSlot * STORAGE_SLOT_MINUTES <= minuteOfDayInTimeZone(now);
}

export function resetFlowForDate(selectedDate: Date): BookingFlowState {
  return {
    selectedDate,
    selectedSlotIds: [],
    selectedCourtId: null,
  };
}

export function resetCourtForSlots(
  state: BookingFlowState,
  selectedSlotIds: number[],
): BookingFlowState {
  return {
    ...state,
    selectedSlotIds: normalizeSelectedSlots(selectedSlotIds),
    selectedCourtId: null,
  };
}

/**
 * Return the 60-minute start slots that are actually offered by at least one
 * active court on the selected weekday. Occupancy is intentionally not checked
 * here: an offered-but-occupied slot still needs to be shown as "Penuh".
 */
export function bookingSlotStartsForSchedules(
  courtSchedules: BookingScheduleDay[][],
  day: number,
): number[] {
  return Array.from(
    { length: 24 / (BOOKING_SLOT_MINUTES / 60) },
    (_, index) => index * STORAGE_SLOTS_PER_SESSION,
  ).filter((startSlot) =>
    courtSchedules.some((schedule) => {
      const selectedDay = schedule.find((item) => item.day === day);
      if (!selectedDay?.available) return false;
      for (
        let slot = startSlot;
        slot < startSlot + STORAGE_SLOTS_PER_SESSION;
        slot++
      ) {
        if (!selectedDay.slots[slot] || selectedDay.slots[slot] === "closed") {
          return false;
        }
      }
      return true;
    }),
  );
}

export function groupSlotsByTimeGroups<T extends { startSlot: number }>(
  slots: T[],
  groups: TimeGroupRange[],
): Array<TimeGroupRange & { slots: T[] }> {
  const sortedGroups = [...groups].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.startHour - right.startHour,
  );
  const grouped = sortedGroups.map((group) => ({ ...group, slots: [] as T[] }));
  const ungrouped: T[] = [];

  for (const slot of slots) {
    const startHour = (slot.startSlot * STORAGE_SLOT_MINUTES) / 60;
    const target = grouped.find(
      (group) =>
        startHour >= group.startHour && startHour < group.endHour,
    );
    if (target) target.slots.push(slot);
    else ungrouped.push(slot);
  }

  const result = grouped.filter((group) => group.slots.length > 0);
  if (ungrouped.length > 0) {
    result.push({
      id: "__other",
      name: "Lainnya",
      startHour: 0,
      endHour: 24,
      color: "#94A3B8",
      sortOrder: Number.MAX_SAFE_INTEGER,
      slots: ungrouped,
    });
  }
  return result;
}
