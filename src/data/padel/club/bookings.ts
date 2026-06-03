// PadelHub — club booking mock data (dummy, no DB)
// Bookings are generated relative to "today" so the calendar always looks live.

import { mockCourts, isPeakHour, courtById } from "./courts";
import { mockMembers } from "./members";

export type BookingType = "member" | "walk_in" | "coaching" | "event";
export type BookingStatus = "confirmed" | "pending" | "checked_in" | "completed" | "cancelled";

export interface Booking {
  id: string;
  courtId: string;
  /** ISO datetime start */
  start: string;
  /** ISO datetime end */
  end: string;
  type: BookingType;
  status: BookingStatus;
  /** display name of the booker (member name or walk-in label) */
  customer: string;
  memberId?: string;
  partySize: number;
  price: number; // IDR total for the slot
  note?: string;
  createdBy: string; // staff/owner who booked
}

export const bookingTypeMeta: Record<
  BookingType,
  { label: string; tone: "primary" | "warning" | "info" | "success"; color: string }
> = {
  member: { label: "Member", tone: "primary", color: "#6D5BFF" },
  walk_in: { label: "Walk-in", tone: "warning", color: "#F59E0B" },
  coaching: { label: "Coaching", tone: "info", color: "#14B8A6" },
  event: { label: "Event / Open Play", tone: "success", color: "#C6FF3D" },
};

export const bookingStatusMeta: Record<
  BookingStatus,
  { label: string; tone: "success" | "warning" | "info" | "neutral" | "error" }
> = {
  confirmed: { label: "Confirmed", tone: "info" },
  pending: { label: "Pending", tone: "warning" },
  checked_in: { label: "Checked-in", tone: "success" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "error" },
};

// ── Helpers ────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");

/** Local date string (no tz drift) for a Date offset by `dayOffset` days. */
export const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const isoAt = (base: Date, dayOffset: number, hour: number, minute = 0): string => {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return `${dateKey(d)}T${pad(hour)}:${pad(minute)}:00`;
};

const slotPrice = (courtId: string, hour: number, isWeekend: boolean, durationMin: number) => {
  const court = courtById(courtId);
  if (!court) return 0;
  const rate = isPeakHour(hour, isWeekend) ? court.pricePeak : court.priceOffPeak;
  return Math.round((rate * durationMin) / 60);
};

// Deterministic pseudo-random so SSR & client match.
let seed = 20260602;
const rand = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

const walkInNames = [
  "Walk-in · Arif",
  "Walk-in · Group of 4",
  "Walk-in · Tegar",
  "Walk-in · Office League",
  "Walk-in · Hendra",
];

const activeCourts = mockCourts.filter((c) => c.status === "active");

function buildBookings(): Booking[] {
  const today = new Date(2026, 5, 2); // June 2 2026 (month is 0-indexed)
  const out: Booking[] = [];
  let counter = 1;

  // Generate for -2 .. +5 days around today
  for (let dayOffset = -2; dayOffset <= 5; dayOffset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + dayOffset);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

    activeCourts.forEach((court, ci) => {
      // operating window 7..22; create a handful of slots per court per day
      for (let hour = 7; hour < 22; hour++) {
        // density: peak hours almost always booked, off-peak ~40%
        const peak = isPeakHour(hour, isWeekend);
        const occupied = peak ? rand() < 0.85 : rand() < 0.4;
        if (!occupied) continue;

        const durationMin = rand() < 0.4 ? 90 : 60;
        const type = pick<BookingType>(
          peak
            ? ["member", "member", "event", "coaching", "walk_in"]
            : ["member", "walk_in", "coaching", "member"],
        );

        let customer: string;
        let memberId: string | undefined;
        if (type === "walk_in") {
          customer = pick(walkInNames);
        } else if (type === "event") {
          customer = pick(["Americano Night", "Mexicano Social", "Open Play Mix"]);
        } else if (type === "coaching") {
          customer = pick(["PT w/ Coach Dimas", "Junior Clinic", "Beginner Class"]);
        } else {
          const m = pick(mockMembers);
          customer = m.name;
          memberId = m.id;
        }

        // status by time: past -> completed/checked_in, today/future -> confirmed/pending
        let status: BookingStatus;
        if (dayOffset < 0) status = rand() < 0.92 ? "completed" : "cancelled";
        else if (dayOffset === 0) {
          const nowHour = 14; // pretend "now" is 2pm
          status = hour < nowHour ? (rand() < 0.9 ? "completed" : "cancelled") : rand() < 0.85 ? "confirmed" : "pending";
        } else status = rand() < 0.8 ? "confirmed" : "pending";

        out.push({
          id: `bk-${pad(counter++)}`,
          courtId: court.id,
          start: isoAt(today, dayOffset, hour),
          end: isoAt(today, dayOffset, hour + Math.floor(durationMin / 60), durationMin % 60),
          type,
          status,
          customer,
          memberId,
          partySize: court.format === "single" ? 2 : 4,
          price: slotPrice(court.id, hour, isWeekend, durationMin),
          note: type === "coaching" ? "60-min private session" : undefined,
          createdBy: pick(["Budi Santoso", "Raka Pradana", "Self-service app"]),
        });

        // skip the next hour if a 90-min booking
        if (durationMin === 90) hour++;
        // small chance to leave the next slot open after a short booking
        if (ci % 3 === 0 && rand() < 0.3) hour++;
      }
    });
  }
  return out;
}

export const mockBookings: Booking[] = buildBookings();

/** All bookings whose start date matches the given local date key (YYYY-MM-DD). */
export const bookingsOnDate = (key: string): Booking[] =>
  mockBookings.filter((b) => b.start.startsWith(key));

export const todayKey = "2026-06-02";

/** Time slots for the court grid (operating hours). */
export const gridHours: number[] = Array.from({ length: 16 }, (_, i) => i + 7); // 7..22
