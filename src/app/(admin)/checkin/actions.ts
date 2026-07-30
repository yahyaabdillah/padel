"use server";

// PadelHub — Check-in server actions (tenant DB backed). All check-in writes go
// through the shared checkin-core helper. RBAC enforced via requirePermission
// ("checkin", ...). Reads require a valid session.

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant-db";
import { readSession, requirePermission } from "@/lib/access-guard";
import { NOT_DELETED } from "@/lib/audit";
import {
  DEFAULT_CHECKIN_SETTINGS,
  type CompanyCheckinSettings,
  findNearestBookingToday,
  loadBookingMatch,
  evaluateWindow,
  recordCheckin,
  verifyBookingToken,
  staffQrText,
} from "@/lib/checkin-core";

export type CheckinLogRow = {
  id: string;
  memberName: string;
  courtName: string | null;
  method: string;
  result: string;
  reason: string | null;
  at: string;
};

export type CheckinPageData = {
  settings: CompanyCheckinSettings;
  staffQr: string;
  companyId: string;
  log: CheckinLogRow[];
  successCount: number;
  rejectCount: number;
  courts: { value: string; label: string }[];
};

export type MemberOption = { value: string; label: string; desc?: string };

export type CheckinActionResult = {
  success: boolean;
  result?: "success" | "rejected";
  reason?: string;
  memberName?: string;
  courtName?: string;
  alreadyCheckedIn?: boolean;
  error?: string;
};

/** Resolve the active tenant's company check-in settings (or safe defaults). */
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
    console.error("[checkin loadSettings] error:", err);
  }
  return { ...DEFAULT_CHECKIN_SETTINGS };
}

function startOfTodayUtcWindow(): { gte: Date; lte: Date } {
  // For the log feed we use a generous "last 24h+" by local day; simpler and
  // robust: today by server date. The page mainly cares about same-day items.
  const now = new Date();
  const gte = new Date(now);
  gte.setHours(0, 0, 0, 0);
  const lte = new Date(now);
  lte.setHours(23, 59, 59, 999);
  return { gte, lte };
}

/** Page bootstrap: settings, today's log, counts, courts. View-gated. */
export async function getCheckinPageDataAction(): Promise<CheckinPageData | null> {
  const guard = await requirePermission("checkin", "view");
  if (!guard.ok) return null;
  const session = guard.session;
  const db = await getTenantDb(session.dbConfig);
  const settings = await loadSettings(db, session.companyId);

  const { gte, lte } = startOfTodayUtcWindow();
  const rows = await db.t_checkin.findMany({
    where: { companyId: session.companyId, isDeleted: 0, at: { gte, lte } },
    orderBy: { at: "desc" },
  });

  const courts = await db.m_court.findMany({
    where: { companyId: session.companyId, status: "active", ...NOT_DELETED },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const log: CheckinLogRow[] = rows.map((r) => ({
    id: r.id,
    memberName: r.memberName,
    courtName: r.courtName,
    method: r.method,
    result: r.result,
    reason: r.reason,
    at: r.at.toISOString(),
  }));

  return {
    settings,
    staffQr: staffQrText(session.companyId),
    companyId: session.companyId,
    log,
    successCount: log.filter((l) => l.result === "success").length,
    rejectCount: log.filter((l) => l.result === "rejected").length,
    courts: courts.map((c) => ({ value: c.id, label: c.name })),
  };
}

/** Search active members for the manual check-in box. */
export async function searchMembersAction(q: string): Promise<MemberOption[]> {
  const session = await readSession();
  if (!session) return [];
  const db = await getTenantDb(session.dbConfig);
  const term = q.trim();
  const rows = await db.t_member.findMany({
    where: {
      companyId: session.companyId,
      status: "active",
      ...NOT_DELETED,
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { phone: { contains: term } },
              { memberNo: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 20,
    select: { id: true, name: true, phone: true, memberNo: true },
  });
  return rows.map((m) => ({ value: m.id, label: m.name, desc: m.phone || m.memberNo }));
}

/** Manual member check-in against their nearest booking today. */
export async function manualCheckinAction(memberId: string): Promise<CheckinActionResult> {
  const guard = await requirePermission("checkin", "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb(session.dbConfig);
  const settings = await loadSettings(db, session.companyId);

  const member = await db.t_member.findFirst({
    where: { id: memberId, companyId: session.companyId, ...NOT_DELETED },
    select: { id: true, name: true },
  });
  if (!member) return { success: false, error: "Member tidak ditemukan." };

  const now = new Date();
  const match = await findNearestBookingToday(
    db,
    session.companyId,
    memberId,
    now,
    settings.timezone,
  );

  // No booking today → rejected (logged).
  if (!match) {
    const res = await recordCheckin(db, {
      companyId: session.companyId,
      method: "manual",
      actor: session.userId,
      memberId: member.id,
      memberName: member.name,
      match: null,
      rejectReason: "Tidak ada booking hari ini",
    });
    revalidatePath("/checkin");
    return { success: true, result: "rejected", reason: res.reason, memberName: member.name };
  }

  // Strict window check.
  const win = evaluateWindow(match, now, settings);
  if (!win.ok) {
    const res = await recordCheckin(db, {
      companyId: session.companyId,
      method: "manual",
      actor: session.userId,
      memberId: member.id,
      memberName: member.name,
      match,
      rejectReason: win.reason,
    });
    revalidatePath("/checkin");
    return {
      success: true,
      result: "rejected",
      reason: res.reason,
      memberName: member.name,
      courtName: match.courtName ?? undefined,
    };
  }

  const res = await recordCheckin(db, {
    companyId: session.companyId,
    method: "manual",
    actor: session.userId,
    memberId: member.id,
    memberName: member.name,
    match,
  });
  revalidatePath("/checkin");
  return {
    success: true,
    result: "success",
    memberName: res.memberName,
    courtName: res.courtName ?? undefined,
    alreadyCheckedIn: res.alreadyCheckedIn,
  };
}

/** Staff scans a member's booking-token QR (scanStaffBooking = true). */
export async function qrStaffScanAction(token: string): Promise<CheckinActionResult> {
  const guard = await requirePermission("checkin", "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb(session.dbConfig);
  const settings = await loadSettings(db, session.companyId);

  const verified = verifyBookingToken(token);
  const logReject = async (reason: string, memberName = "Tidak dikenal") => {
    await db.t_checkin.create({
      data: {
        companyId: session.companyId,
        memberId: null,
        memberName,
        bookingId: null,
        courtName: null,
        method: "qr",
        result: "rejected",
        reason,
        at: new Date(),
        createdBy: session.userId,
      },
    });
    revalidatePath("/checkin");
    return { success: true, result: "rejected" as const, reason };
  };

  if (!verified.ok) return logReject(verified.reason);
  if (verified.companyId !== session.companyId) return logReject("QR milik klub lain");
  if (Date.now() > verified.expMs) return logReject("QR sudah kedaluwarsa");

  const match = await loadBookingMatch(db, session.companyId, verified.bookingId);
  if (!match) return logReject("Booking tidak ditemukan");

  // resolve member name for the log
  let memberName = match.customer;
  if (match.memberId) {
    const m = await db.t_member.findFirst({
      where: { id: match.memberId, companyId: session.companyId },
      select: { name: true },
    });
    if (m?.name) memberName = m.name;
  }

  const now = new Date();
  const win = evaluateWindow(match, now, settings);
  if (!win.ok) {
    const res = await recordCheckin(db, {
      companyId: session.companyId,
      method: "qr",
      actor: session.userId,
      memberId: match.memberId,
      memberName,
      match,
      rejectReason: win.reason,
    });
    revalidatePath("/checkin");
    return { success: true, result: "rejected", reason: res.reason, memberName, courtName: match.courtName ?? undefined };
  }

  const res = await recordCheckin(db, {
    companyId: session.companyId,
    method: "qr",
    actor: session.userId,
    memberId: match.memberId,
    memberName,
    match,
  });
  revalidatePath("/checkin");
  return {
    success: true,
    result: "success",
    memberName: res.memberName,
    courtName: res.courtName ?? undefined,
    alreadyCheckedIn: res.alreadyCheckedIn,
  };
}
