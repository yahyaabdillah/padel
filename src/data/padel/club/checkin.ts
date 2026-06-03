// PadelHub — check-in domain (dummy, no DB).
// Front desk shows a STATIC QR for members to scan; members confirm via the
// member portal. A check-in is only valid if the member has a booking today,
// and (in strict mode) a booking that starts within ±10 minutes of "now".
// The validation lives ONLY here so both the front-desk and member pages share
// one source of truth.

import type { Booking } from "./bookings";

export type CheckinMethod = "qr" | "manual" | "walkin";
export type CheckinResult = "success" | "rejected";

export interface CheckinRecord {
  id: string;
  memberId: string;
  memberName: string;
  bookingId?: string;
  courtName?: string;
  method: CheckinMethod;
  /** ISO datetime of the check-in attempt */
  at: string;
  result: CheckinResult;
  /** populated when result === "rejected" */
  reason?: string;
}

export const checkinMethodMeta: Record<
  CheckinMethod,
  { label: string; tone: "primary" | "info" | "warning" }
> = {
  qr: { label: "QR Scan", tone: "primary" },
  manual: { label: "Manual", tone: "info" },
  walkin: { label: "Walk-in", tone: "warning" },
};

/** The static QR payload printed at the front desk for a given club. */
export const STATIC_QR_TEXT = (clubId: string): string =>
  `PADELHUB-CHECKIN-${clubId}`;

/** ± minutes window around a booking start that counts as "on time" (strict). */
export const CHECKIN_WINDOW_MIN = 10;

/** Local date key the demo treats as "today" (aligns with bookings seed). */
export const todayKey = "2026-06-02";

/* ── Seed today's check-in log (a realistic front-desk feed) ─────────── */
const at = (hhmm: string) => `${todayKey}T${hhmm}:00`;

export const mockCheckins: CheckinRecord[] = [
  {
    id: "ci-001",
    memberId: "mbr-005",
    memberName: "Bagus Setiawan",
    bookingId: "bk-12",
    courtName: "Center Court",
    method: "qr",
    at: at("07:58"),
    result: "success",
  },
  {
    id: "ci-002",
    memberId: "mbr-002",
    memberName: "Sarah Kusuma",
    bookingId: "bk-21",
    courtName: "Glass Arena",
    method: "manual",
    at: at("08:32"),
    result: "success",
  },
  {
    id: "ci-003",
    memberId: "mbr-d01",
    memberName: "Tegar Saputra",
    courtName: "Rooftop A",
    method: "walkin",
    at: at("11:02"),
    result: "success",
  },
  {
    id: "ci-004",
    memberId: "mbr-009",
    memberName: "Fikri Ramadhan",
    method: "qr",
    at: at("11:40"),
    result: "rejected",
    reason: "Belum masuk jendela check-in (±10 menit)",
  },
  {
    id: "ci-005",
    memberId: "mbr-d02",
    memberName: "Hendra Gunawan",
    courtName: "Single Box",
    method: "walkin",
    at: at("12:05"),
    result: "success",
  },
  {
    id: "ci-006",
    memberId: "mbr-001",
    memberName: "Andi Wijaya",
    bookingId: "bk-44",
    courtName: "Center Court",
    method: "manual",
    at: at("13:25"),
    result: "success",
  },
];

export interface ValidateCheckinArgs {
  memberId: string;
  now: Date;
  bookings: Booking[];
  /** strict = require a booking starting within ±CHECKIN_WINDOW_MIN of now */
  strict: boolean;
}

export interface ValidateCheckinResult {
  ok: boolean;
  booking?: Booking;
  reason?: string;
}

/**
 * Pure check-in validator shared by the front-desk and member pages.
 * - No today-booking for the member → reject.
 * - strict: a booking whose start is within ±CHECKIN_WINDOW_MIN of `now`.
 * - non-strict: any (non-cancelled) booking today is acceptable; the nearest
 *   upcoming/most-recent one is returned.
 */
export function validateCheckin(
  args: ValidateCheckinArgs,
): ValidateCheckinResult {
  const { memberId, now, bookings, strict } = args;

  const todays = bookings.filter(
    (b) =>
      b.memberId === memberId &&
      b.start.startsWith(todayKey) &&
      b.status !== "cancelled",
  );

  if (todays.length === 0) {
    return { ok: false, reason: "Tidak ada booking hari ini" };
  }

  const nowMs = now.getTime();
  const windowMs = CHECKIN_WINDOW_MIN * 60_000;

  // Booking nearest to "now" by start time.
  const nearest = [...todays].sort(
    (a, b) =>
      Math.abs(new Date(a.start).getTime() - nowMs) -
      Math.abs(new Date(b.start).getTime() - nowMs),
  )[0];

  if (!strict) {
    return { ok: true, booking: nearest };
  }

  const within = todays.find(
    (b) => Math.abs(new Date(b.start).getTime() - nowMs) <= windowMs,
  );

  if (!within) {
    return {
      ok: false,
      booking: nearest,
      reason: `Belum masuk jendela check-in (±${CHECKIN_WINDOW_MIN} menit)`,
    };
  }

  return { ok: true, booking: within };
}

/** Fixed "now" the demo uses so check-ins line up with the bookings seed. */
export const demoNow = new Date("2026-06-02T14:00:00");
