// PadelHub — shared check-in core. Single source of truth for the check-in
// flow used by every path (manual, walk-in, QR staff-scans-member, QR
// member-scans-staff). Pure helpers + one transactional writer. No UI, no RBAC
// (callers enforce RBAC); this module only validates + persists.

import crypto from "crypto";
import type { PrismaClient } from "@prisma/tenant-client";
import { getCheckinTokenSecret } from "@/lib/env";

export type CheckinMethod = "manual" | "qr" | "walkin";
export type CheckinResultKind = "success" | "rejected";

export interface CompanyCheckinSettings {
  scanStaffBooking: boolean;
  strictWindow: boolean;
  checkinWindowMin: number;
  timezone: string;
}

export const DEFAULT_CHECKIN_SETTINGS: CompanyCheckinSettings = {
  scanStaffBooking: false,
  strictWindow: false,
  checkinWindowMin: 15,
  timezone: "Asia/Jakarta",
};

/** The static QR payload printed at the front desk for a given tenant. */
export const staffQrText = (companyId: string): string =>
  `PADELHUB-CHECKIN-${companyId}`;

/* ════════════════════════════════════════════════════════
 *  BOOKING TOKEN (signed, member-shown QR)
 * ════════════════════════════════════════════════════════ */

interface TokenPayload {
  c: string; // companyId
  b: string; // bookingId
  exp: number; // epoch ms — booking's latest line end
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(data: string): string {
  return b64url(
    crypto.createHmac("sha256", getCheckinTokenSecret()).update(data).digest(),
  );
}

/** Produce a signed token: base64url(payload).signature */
export function signBookingToken(
  companyId: string,
  bookingId: string,
  expMs: number,
): string {
  const payload: TokenPayload = { c: companyId, b: bookingId, exp: expMs };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export type VerifiedToken =
  | { ok: true; companyId: string; bookingId: string; expMs: number }
  | { ok: false; reason: string };

/** Verify signature, then return the decoded payload. Does NOT check expiry or
 * tenant — callers compare tenant + `now` to keep reasons specific. */
export function verifyBookingToken(token: string): VerifiedToken {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { ok: false, reason: "QR tidak valid" };
  }
  const [body, sig] = token.split(".");
  if (!body || !sig) return { ok: false, reason: "QR tidak valid" };

  const expected = sign(body);
  // constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "Tanda tangan QR tidak valid" };
  }

  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as TokenPayload;
    if (!payload.c || !payload.b || typeof payload.exp !== "number") {
      return { ok: false, reason: "QR tidak valid" };
    }
    return { ok: true, companyId: payload.c, bookingId: payload.b, expMs: payload.exp };
  } catch {
    return { ok: false, reason: "QR tidak valid" };
  }
}

/* ════════════════════════════════════════════════════════
 *  TODAY / WINDOW HELPERS (timezone-aware)
 * ════════════════════════════════════════════════════════ */

/** The YYYY-MM-DD calendar date of `instant` in the given IANA timezone. */
export function dateKeyInTz(instant: Date, timezone: string): string {
  try {
    // en-CA gives YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(instant);
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

/** True if two instants fall on the same calendar day in `timezone`. */
export function sameDayInTz(a: Date, b: Date, timezone: string): boolean {
  return dateKeyInTz(a, timezone) === dateKeyInTz(b, timezone);
}

export interface BookingMatch {
  bookingId: string;
  /** earliest line start across the booking's non-cancelled lines */
  start: Date;
  /** latest line end across the booking's non-cancelled lines */
  end: Date;
  status: string;
  courtName: string | null;
  memberId: string | null;
  customer: string;
}

const ACTIVE_LINE = { not: "cancelled" } as const;

/**
 * Resolve the member's non-cancelled bookings for "today" (in tenant tz) and
 * return the one whose earliest line start is nearest to `now`. Null if none.
 */
export async function findNearestBookingToday(
  db: PrismaClient,
  companyId: string,
  memberId: string,
  now: Date,
  timezone: string,
): Promise<BookingMatch | null> {
  const bookings = await db.t_booking.findMany({
    where: {
      companyId,
      memberId,
      isDeleted: 0,
      status: { not: "cancelled" },
      details: { some: { isDeleted: 0, status: ACTIVE_LINE } },
    },
    include: {
      details: { where: { isDeleted: 0, status: ACTIVE_LINE }, include: { court: true } },
    },
  });

  const matches: BookingMatch[] = [];
  for (const bk of bookings) {
    const lines = bk.details;
    if (lines.length === 0) continue;
    const starts = lines.map((l) => l.start.getTime());
    const ends = lines.map((l) => l.end.getTime());
    const start = new Date(Math.min(...starts));
    const end = new Date(Math.max(...ends));
    if (!sameDayInTz(start, now, timezone)) continue;
    matches.push({
      bookingId: bk.id,
      start,
      end,
      status: bk.status,
      courtName: lines[0]?.court?.name ?? null,
      memberId: bk.memberId,
      customer: bk.customer,
    });
  }

  if (matches.length === 0) return null;
  const nowMs = now.getTime();
  matches.sort(
    (a, b) => Math.abs(a.start.getTime() - nowMs) - Math.abs(b.start.getTime() - nowMs),
  );
  return matches[0];
}

/** Load a single booking by id as a BookingMatch (for token-scan path). */
export async function loadBookingMatch(
  db: PrismaClient,
  companyId: string,
  bookingId: string,
): Promise<BookingMatch | null> {
  const bk = await db.t_booking.findFirst({
    where: { id: bookingId, companyId, isDeleted: 0 },
    include: {
      details: { where: { isDeleted: 0, status: ACTIVE_LINE }, include: { court: true } },
    },
  });
  if (!bk || bk.details.length === 0) return null;
  const starts = bk.details.map((l) => l.start.getTime());
  const ends = bk.details.map((l) => l.end.getTime());
  return {
    bookingId: bk.id,
    start: new Date(Math.min(...starts)),
    end: new Date(Math.max(...ends)),
    status: bk.status,
    courtName: bk.details[0]?.court?.name ?? null,
    memberId: bk.memberId,
    customer: bk.customer,
  };
}

export interface WindowResult {
  ok: boolean;
  reason?: string;
}

/**
 * Apply the strict/loose window rule. Loose: any non-cancelled booking today is
 * acceptable. Strict: the booking must start within ±checkinWindowMin of now.
 */
export function evaluateWindow(
  match: BookingMatch,
  now: Date,
  settings: CompanyCheckinSettings,
): WindowResult {
  if (!settings.strictWindow) return { ok: true };
  const windowMs = Math.max(0, settings.checkinWindowMin) * 60_000;
  const diff = Math.abs(match.start.getTime() - now.getTime());
  if (diff <= windowMs) return { ok: true };
  return {
    ok: false,
    reason: `Belum masuk jendela check-in (±${settings.checkinWindowMin} menit)`,
  };
}

/* ════════════════════════════════════════════════════════
 *  WRITER — the single place that persists a check-in
 * ════════════════════════════════════════════════════════ */

export interface RecordCheckinArgs {
  companyId: string;
  method: CheckinMethod;
  actor: string; // createdBy (staff userId or member username)
  memberId: string | null;
  memberName: string;
  /** booking to check in (null for walk-in / no-booking reject) */
  match: BookingMatch | null;
  /** when set, force a rejected record with this reason (skips status flip) */
  rejectReason?: string;
}

export interface RecordCheckinResult {
  result: CheckinResultKind;
  reason?: string;
  checkinId: string;
  bookingId: string | null;
  memberName: string;
  courtName: string | null;
  /** true when the booking was already checked in (no duplicate success) */
  alreadyCheckedIn?: boolean;
}

/**
 * Persist a check-in attempt. On success (no rejectReason and a valid match),
 * flips the booking header + all non-cancelled lines to `checked_in` inside a
 * transaction. Always writes a t_checkin row (success OR rejected) for audit.
 */
export async function recordCheckin(
  db: PrismaClient,
  args: RecordCheckinArgs,
): Promise<RecordCheckinResult> {
  const { companyId, method, actor, memberId, memberName, match } = args;
  const now = new Date();

  // Rejected path — log only, no status change.
  if (args.rejectReason || !match) {
    const reason = args.rejectReason ?? "Tidak ada booking hari ini";
    const row = await db.t_checkin.create({
      data: {
        companyId,
        memberId: memberId ?? null,
        memberName,
        bookingId: match?.bookingId ?? null,
        courtName: match?.courtName ?? null,
        method,
        result: "rejected",
        reason,
        at: now,
        createdBy: actor,
      },
    });
    return {
      result: "rejected",
      reason,
      checkinId: row.id,
      bookingId: match?.bookingId ?? null,
      memberName,
      courtName: match?.courtName ?? null,
    };
  }

  // Already checked in — inform, do not create a duplicate success row.
  if (match.status === "checked_in") {
    return {
      result: "success",
      checkinId: "",
      bookingId: match.bookingId,
      memberName,
      courtName: match.courtName,
      alreadyCheckedIn: true,
    };
  }

  // Success — flip header + lines and log, atomically.
  const row = await db.$transaction(async (tx) => {
    await tx.t_booking.update({
      where: { id: match.bookingId },
      data: { status: "checked_in", updatedBy: actor },
    });
    await tx.t_booking_detail.updateMany({
      where: { bookingId: match.bookingId, isDeleted: 0, status: { not: "cancelled" } },
      data: { status: "checked_in", updatedBy: actor },
    });
    return tx.t_checkin.create({
      data: {
        companyId,
        memberId: memberId ?? match.memberId ?? null,
        memberName,
        bookingId: match.bookingId,
        courtName: match.courtName,
        method,
        result: "success",
        at: now,
        createdBy: actor,
      },
    });
  });

  return {
    result: "success",
    checkinId: row.id,
    bookingId: match.bookingId,
    memberName,
    courtName: match.courtName,
  };
}
