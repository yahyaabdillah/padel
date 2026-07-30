"use server";

// PadelHub — member-portal check-in server actions. The acting subject is the
// logged-in member (session.role === "member", session.id === t_member.id).
// Direction follows the company "Staff scan booking" toggle:
//   ON  → member DISPLAYS a signed booking-token QR (staff scans it elsewhere)
//   OFF → member SCANS the static staff QR here, self-checking-in
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant-db";
import type { AuthSession } from "@/lib/auth-types";
import { NOT_DELETED } from "@/lib/audit";
import { readSession } from "@/lib/access-guard";
import {
  DEFAULT_CHECKIN_SETTINGS,
  type CompanyCheckinSettings,
  findNearestBookingToday,
  evaluateWindow,
  recordCheckin,
  signBookingToken,
  staffQrText,
} from "@/lib/checkin-core";

async function requireMemberSession(): Promise<AuthSession | null> {
  const session = await readSession();
  return session?.role === "member" ? session : null;
}

async function loadSettings(
  db: Awaited<ReturnType<typeof getTenantDb>>,
  companyId: string,
): Promise<CompanyCheckinSettings> {
  try {
    const row = await db.m_company.findFirst({ where: { companyId, ...NOT_DELETED } });
    if (row) {
      return {
        scanStaffBooking: row.scanStaffBooking,
        strictWindow: row.strictWindow,
        checkinWindowMin: row.checkinWindowMin,
        timezone: row.timezone,
      };
    }
  } catch (err) {
    console.error("[me/checkin loadSettings] error:", err);
  }
  return { ...DEFAULT_CHECKIN_SETTINGS };
}

export type MyCheckinView = {
  scanStaffBooking: boolean;
  /** when scanStaffBooking → the signed token QR text to display (or null) */
  bookingToken: string | null;
  /** when !scanStaffBooking → the static staff QR text the member should scan */
  staffQr: string;
  /** nearest booking summary for display */
  booking: {
    courtName: string | null;
    start: string;
    end: string;
    alreadyCheckedIn: boolean;
  } | null;
  hasBookingToday: boolean;
};

export type MyCheckinResult = {
  success: boolean;
  result?: "success" | "rejected";
  reason?: string;
  courtName?: string;
  alreadyCheckedIn?: boolean;
  error?: string;
};

/** Build the member's check-in view (QR to show, or staff QR to scan). */
export async function getMyCheckinViewAction(): Promise<MyCheckinView | null> {
  const session = await requireMemberSession();
  if (!session) return null;
  const db = await getTenantDb(session.dbConfig);
  const settings = await loadSettings(db, session.companyId);
  const staffQr = staffQrText(session.companyId);

  const match = await findNearestBookingToday(
    db,
    session.companyId,
    session.id,
    new Date(),
    settings.timezone,
  );

  if (!match) {
    return {
      scanStaffBooking: settings.scanStaffBooking,
      bookingToken: null,
      staffQr,
      booking: null,
      hasBookingToday: false,
    };
  }

  const bookingToken = settings.scanStaffBooking
    ? signBookingToken(session.companyId, match.bookingId, match.end.getTime())
    : null;

  return {
    scanStaffBooking: settings.scanStaffBooking,
    bookingToken,
    staffQr,
    booking: {
      courtName: match.courtName,
      start: match.start.toISOString(),
      end: match.end.toISOString(),
      alreadyCheckedIn: match.status === "checked_in",
    },
    hasBookingToday: true,
  };
}

/** Member scanned the static staff QR → self check-in (scanStaffBooking=false). */
export async function mySelfCheckinAction(staffQrTextScanned: string): Promise<MyCheckinResult> {
  const session = await requireMemberSession();
  if (!session) return { success: false, error: "Sesi tidak valid." };
  const db = await getTenantDb(session.dbConfig);
  const settings = await loadSettings(db, session.companyId);

  const member = await db.t_member.findFirst({
    where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
    select: { id: true, name: true },
  });
  if (!member) return { success: false, error: "Member tidak ditemukan." };

  const logReject = async (reason: string) => {
    await recordCheckin(db, {
      companyId: session.companyId,
      method: "qr",
      actor: session.userId,
      memberId: member.id,
      memberName: member.name,
      match: null,
      rejectReason: reason,
    });
    revalidatePath("/me/checkin");
    return { success: true, result: "rejected" as const, reason };
  };

  // Validate the scanned QR actually belongs to this club.
  if (staffQrTextScanned.trim() !== staffQrText(session.companyId)) {
    return logReject("QR tidak dikenali / milik klub lain");
  }

  const now = new Date();
  const match = await findNearestBookingToday(
    db,
    session.companyId,
    member.id,
    now,
    settings.timezone,
  );
  if (!match) return logReject("Tidak ada booking hari ini");

  const win = evaluateWindow(match, now, settings);
  if (!win.ok) return logReject(win.reason ?? "Di luar jendela check-in");

  const res = await recordCheckin(db, {
    companyId: session.companyId,
    method: "qr",
    actor: session.userId,
    memberId: member.id,
    memberName: member.name,
    match,
  });
  revalidatePath("/me/checkin");
  return {
    success: true,
    result: "success",
    courtName: res.courtName ?? undefined,
    alreadyCheckedIn: res.alreadyCheckedIn,
  };
}

/* ════════════════════════════════════════════════════════
 *  BOOKING LIST + HISTORY (member portal check-in page)
 * ════════════════════════════════════════════════════════ */

export type MyBookingRow = {
  id: string; // booking header id
  courtName: string | null;
  start: string; // ISO (earliest line)
  end: string; // ISO (latest line)
  status: string; // confirmed | checked_in | completed | cancelled | pending
  /** number of court lines in this booking */
  lines: number;
  totalPrice: number;
  /** per-session detail lines (for member-side cancel) */
  sessions: {
    detailId: string;
    courtName: string | null;
    start: string;
    end: string;
    status: string;
    price: number;
  }[];
};

export type MyBookingsData = {
  upcoming: MyBookingRow[]; // today + future, not cancelled/completed
  history: MyBookingRow[]; // past / completed / cancelled
};

/** Booking list + history for the logged-in member. */
export async function getMyBookingsAction(): Promise<MyBookingsData> {
  const session = await requireMemberSession();
  if (!session) return { upcoming: [], history: [] };
  const db = await getTenantDb(session.dbConfig);

  const bookings = await db.t_booking.findMany({
    where: {
      companyId: session.companyId,
      memberId: session.id,
      isDeleted: 0,
      details: { some: { isDeleted: 0 } },
    },
    include: { details: { where: { isDeleted: 0 }, include: { court: true } } },
    orderBy: { createdAt: "desc" },
  });

  const now = Date.now();
  const upcoming: MyBookingRow[] = [];
  const history: MyBookingRow[] = [];

  for (const b of bookings) {
    const lines = b.details;
    if (lines.length === 0) continue;
    const starts = lines.map((l) => l.start.getTime());
    const ends = lines.map((l) => l.end.getTime());
    const start = new Date(Math.min(...starts));
    const end = new Date(Math.max(...ends));

    const row: MyBookingRow = {
      id: b.id,
      courtName: lines[0]?.court?.name ?? null,
      start: start.toISOString(),
      end: end.toISOString(),
      status: b.status,
      lines: lines.length,
      totalPrice: b.totalPrice,
      sessions: lines
        .slice()
        .sort((a, c) => a.start.getTime() - c.start.getTime())
        .map((l) => ({
          detailId: l.id,
          courtName: l.court?.name ?? null,
          start: l.start.toISOString(),
          end: l.end.toISOString(),
          status: l.status,
          price: l.price,
        })),
    };

    const isClosed =
      b.status === "cancelled" || b.status === "completed" || end.getTime() < now;
    if (isClosed) history.push(row);
    else upcoming.push(row);
  }

  // upcoming: soonest first; history: most recent first
  upcoming.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  history.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

  return { upcoming, history };
}
