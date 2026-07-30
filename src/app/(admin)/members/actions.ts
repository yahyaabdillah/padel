"use server";

import * as bcrypt from "bcryptjs";
import { getTenantDb } from "@/lib/tenant-db";
import { auditCreate, auditSoftDelete, auditUpdate, NOT_DELETED } from "@/lib/audit";
import { readSession, requirePermission } from "@/lib/access-guard";
import { revalidatePath } from "next/cache";
import { applyMembershipAction, recordPayment } from "@/lib/checkout-core";
import { calcMembershipBenefit } from "@/lib/membership-benefit";
import { calculateCourtBasePrice } from "@/lib/court-price";
import { quotaUnitsForDuration } from "@/lib/membership-quota";

export type MemberRecord = {
  id: string;
  memberNo: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  tier: string;
  status: string;
  onboarded: boolean;
  city: string | null;
  avatar: string | null;
  createdAt: string;
  // membership
  planId: string | null;
  planName: string | null;
  planColor: string | null;
  quotaUsed: number;
  coachingUsed: number;
  cycleStart: string | null;
};

export type BookingDraftInput = {
  courtId: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  type: "member" | "walk_in" | "coaching" | "event";
  status: "confirmed" | "pending" | "checked_in" | "completed" | "cancelled";
  customer: string;
  partySize: number;
  price: number;
  note?: string;
  createdBy: string;
};

export type RegisterMemberInput = {
  name: string;
  /** login username for the member portal */
  username: string;
  phone: string;
  email?: string;
  city?: string;
  /** membership plan to assign on registration (null = no plan / walk-in) */
  planId?: string | null;
  /** collect the plan's join fee now (page register checkout). When false the
   * join fee stays outstanding and is collected at the booking payment step. */
  collectJoinFee?: boolean;
  /** court bookings assembled in the registration form (paid at booking) */
  bookings?: BookingDraftInput[];
};

export type RegisterMemberResult = {
  success: boolean;
  error?: string;
  id?: string;
  memberNo?: string;
  username?: string;
  /** system-generated initial password (show once so staff can hand it over) */
  tempPassword?: string;
};

function genMemberNo(): string {
  return `PHB-2026-${String(1000 + Math.floor(Math.random() * 8999))}`;
}

/** Generate a readable temporary password (no ambiguous chars). The member can
 * change it later from their portal account. */
function genTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** Membership plan benefits surfaced to the registration / booking UIs. */
export type PlanOption = {
  id: string;
  name: string;
  color: string;
  joinFee: number;
  includedCourtBookings: number;
  resetPeriodDays: number;
  freeCoaching: number;
  courtDiscountPct: number;
  perks: string[];
  highlighted: boolean;
};

/** Active membership plans for the tenant (by sort order) — for pickers. */
export async function getActivePlansAction(): Promise<PlanOption[]> {
  const session = await readSession();
  if (!session) return [];
  const db = await getTenantDb(session.dbConfig);
  const rows = await db.m_membership_plan.findMany({
    where: { companyId: session.companyId, active: true, ...NOT_DELETED },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    joinFee: p.joinFee,
    includedCourtBookings: p.includedCourtBookings,
    resetPeriodDays: p.resetPeriodDays,
    freeCoaching: p.freeCoaching,
    courtDiscountPct: p.courtDiscountPct,
    perks: Array.isArray(p.perks) ? (p.perks as string[]) : [],
    highlighted: p.highlighted,
  }));
}

/** Lightweight member options for booking/select inputs (newest first). */
export async function getMemberOptionsAction(): Promise<
  { id: string; name: string; phone: string; tier: string }[]
> {
  const session = await readSession();
  if (!session) return [];
  const db = await getTenantDb(session.dbConfig);
  const rows = await db.t_member.findMany({
    where: { companyId: session.companyId, isDeleted: 0 },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true, tier: true },
  });
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    phone: m.phone,
    tier: m.tier,
  }));
}

/** List members for the current tenant (newest first). */
export async function getMembersAction(): Promise<MemberRecord[]> {
  const session = await readSession();
  if (!session) return [];

  const db = await getTenantDb(session.dbConfig);
  const rows = await db.t_member.findMany({
    where: { companyId: session.companyId, isDeleted: 0 },
    orderBy: { createdAt: "desc" },
    include: { plan: { select: { id: true, name: true, color: true } } },
  });

  return rows.map((m) => ({
    id: m.id,
    memberNo: m.memberNo,
    username: m.username,
    name: m.name,
    phone: m.phone,
    email: m.email ?? "",
    tier: m.tier,
    status: m.status,
    onboarded: m.onboarded,
    city: m.city,
    avatar: m.avatar,
    createdAt: m.createdAt.toISOString(),
    planId: m.planId,
    planName: m.plan?.name ?? null,
    planColor: m.plan?.color ?? null,
    quotaUsed: m.quotaUsed,
    coachingUsed: m.coachingUsed,
    cycleStart: m.cycleStart ? m.cycleStart.toISOString() : null,
  }));
}

/**
 * Assign (or clear) a member's membership plan from the member detail drawer.
 * Assigning a plan routes through the shared checkout core so a
 * t_membership_history row (and a payment record when a join fee applies) is
 * written — the join fee is NEVER recorded on t_booking. Clearing a plan
 * (planId = null) is an admin correction, not a purchase, so it writes no
 * history/payment. Resets the quota cycle on assign.
 */
export async function assignMemberPlanAction(
  memberId: string,
  planId: string | null,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("members.data", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb(session.dbConfig);

  const member = await db.t_member.findFirst({
    where: { id: memberId, companyId: session.companyId, ...NOT_DELETED },
    select: { id: true, planId: true, joinFeePaid: true },
  });
  if (!member) return { success: false, error: "Member tidak ditemukan." };

  // Clear membership (admin correction; not a purchase → no history/payment).
  if (!planId) {
    await db.t_member.updateMany({
      where: { id: memberId, companyId: session.companyId, ...NOT_DELETED },
      data: {
        planId: null,
        tier: "daily",
        cycleStart: null,
        quotaUsed: 0,
        coachingUsed: 0,
        joinFeePaid: false,
        ...auditUpdate(session.userId),
      },
    });
    revalidatePath("/members");
    return { success: true };
  }

  // Assign / change plan → history (+ payment when a join fee applies) via core.
  const plan = await db.m_membership_plan.findFirst({
    where: { id: planId, companyId: session.companyId, active: true, ...NOT_DELETED },
  });
  if (!plan) return { success: false, error: "Plan tidak ditemukan." };

  // Same plan re-set = extend; different existing plan = upgrade; none = assign.
  const action: "assign" | "extend" | "upgrade" = !member.planId
    ? "assign"
    : member.planId === planId
      ? "extend"
      : "upgrade";

  try {
    await db.$transaction(async (tx) => {
      const joinFee = plan.joinFee;
      const hist = await applyMembershipAction(tx, {
        companyId: session.companyId,
        memberId: member.id,
        planId: plan.id,
        action,
        actor: { kind: "staff", userId: session.userId },
        joinFee,
        method: joinFee > 0 ? "Cash" : undefined,
      });
      if (joinFee > 0) {
        const pay = await recordPayment(tx, {
          companyId: session.companyId,
          method: "Cash",
          membershipAmount: joinFee,
          courtAmount: 0,
          paidByType: "staff",
          cashReceived: joinFee,
          actor: { kind: "staff", userId: session.userId },
        });
        await tx.t_membership_history.update({
          where: { id: hist.historyId },
          data: { paymentId: pay.id },
        });
      }
    });
  } catch (err) {
    console.error("[assignMemberPlanAction] error:", err);
    return { success: false, error: "Gagal mengatur membership." };
  }

  revalidatePath("/members");
  return { success: true };
}

export type UpdateMemberInput = {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  status?: "active" | "inactive" | "frozen";
};

/** Update a member's editable profile fields. */
export async function updateMemberAction(
  id: string,
  patch: UpdateMemberInput,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("members.data", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb(session.dbConfig);
  await db.t_member.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: {
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.phone !== undefined && { phone: patch.phone }),
      ...(patch.email !== undefined && { email: patch.email.trim() || null }),
      ...(patch.city !== undefined && { city: patch.city.trim() || null }),
      ...(patch.status !== undefined && { status: patch.status }),
      ...auditUpdate(session.userId),
    },
  });
  revalidatePath("/members");
  return { success: true };
}

/** Soft-delete a member (audit-preserving). */
export async function deleteMemberAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("members.data", "delete");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb(session.dbConfig);
  await db.t_member.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: auditSoftDelete(session.userId),
  });
  revalidatePath("/members");
  return { success: true };
}

/** Check whether a member username is available for this tenant. */
export async function checkMemberUsernameAction(
  username: string,
): Promise<{ available: boolean }> {
  const session = await readSession();
  if (!session) return { available: false };
  const u = username.trim().toLowerCase();
  if (u.length < 3) return { available: false };
  const db = await getTenantDb(session.dbConfig);
  const existing = await db.t_member.findFirst({
    where: { companyId: session.companyId, username: u },
  });
  return { available: !existing };
}

/* ════════════════════════════════════════════════════════
 *  IMPORT / EXPORT (gated by members.data import/export)
 * ════════════════════════════════════════════════════════ */

const CSV_HEADERS = ["memberNo", "name", "username", "phone", "email", "city", "status", "tier"] as const;

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Export all members as a CSV string. Gated by members.data:export. */
export async function exportMembersCsvAction(): Promise<{
  success: boolean;
  error?: string;
  csv?: string;
  filename?: string;
}> {
  const guard = await requirePermission("members.data", "export");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb(session.dbConfig);
  const rows = await db.t_member.findMany({
    where: { companyId: session.companyId, ...NOT_DELETED },
    orderBy: { createdAt: "desc" },
  });
  const lines = [CSV_HEADERS.join(",")];
  for (const m of rows) {
    lines.push(
      [
        m.memberNo,
        m.name,
        m.username,
        m.phone,
        m.email ?? "",
        m.city ?? "",
        m.status,
        m.tier,
      ]
        .map((v) => csvEscape(String(v)))
        .join(","),
    );
  }
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    success: true,
    csv: lines.join("\n"),
    filename: `members-${stamp}.csv`,
  };
}

export type ImportMembersResult = {
  success: boolean;
  error?: string;
  created?: number;
  skipped?: number;
  errors?: string[];
};

/**
 * Import members from CSV text. Expected columns (header row):
 * name, phone, [username], [email], [city]. Each row creates a member with a
 * generated memberNo + temp password. Rows with a duplicate username or invalid
 * data are skipped (reported). Gated by members.data:import.
 */
export async function importMembersCsvAction(
  csv: string,
): Promise<ImportMembersResult> {
  const guard = await requirePermission("members.data", "import");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb(session.dbConfig);

  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { success: false, error: "CSV kosong atau tanpa baris data." };
  }

  // parse header → column index
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iName = col("name");
  const iPhone = col("phone");
  const iUsername = col("username");
  const iEmail = col("email");
  const iCity = col("city");
  if (iName === -1 || iPhone === -1) {
    return { success: false, error: "Header wajib: minimal 'name' dan 'phone'." };
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r]);
    const name = (cells[iName] ?? "").trim();
    const phone = (cells[iPhone] ?? "").trim();
    const rawUser = iUsername !== -1 ? (cells[iUsername] ?? "").trim() : "";
    const email = iEmail !== -1 ? (cells[iEmail] ?? "").trim() : "";
    const city = iCity !== -1 ? (cells[iCity] ?? "").trim() : "";

    if (name.length < 2 || phone.replace(/\D/g, "").length < 8) {
      skipped++;
      errors.push(`Baris ${r + 1}: nama/telepon tidak valid.`);
      continue;
    }
    const username =
      (rawUser || name).toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) ||
      `m${Date.now().toString(36)}`;

    const clash = await db.t_member.findFirst({
      where: { companyId: session.companyId, username },
    });
    if (clash) {
      skipped++;
      errors.push(`Baris ${r + 1}: username "${username}" sudah dipakai.`);
      continue;
    }

    const tempPassword = genTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await db.t_member.create({
      data: {
        companyId: session.companyId,
        memberNo: genMemberNo(),
        username,
        passwordHash,
        name,
        phone,
        email: email || null,
        city: city || null,
        tier: "daily",
        status: "active",
        onboarded: false,
        ...auditCreate(session.userId),
      },
    });
    created++;
  }

  revalidatePath("/members");
  return { success: true, created, skipped, errors: errors.slice(0, 20) };
}

/** Minimal CSV line parser handling quoted fields. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * Register a member at the front desk. Registration is FREE (no payment for the
 * membership itself) — only court bookings (if any) carry a charged price.
 * Membership tier economics + coaching are deferred; tier defaults to "daily".
 * The member can log in to the member portal using username + password.
 */
export async function registerMemberAction(
  input: RegisterMemberInput,
): Promise<RegisterMemberResult> {
  try {
    const guard = await requirePermission("members.register", "create");
    if (!guard.ok) return { success: false, error: guard.error };
    const session = guard.session;

    if (!input.name?.trim() || input.name.trim().length < 2) {
      return { success: false, error: "Nama minimal 2 karakter." };
    }
    const username = input.username?.trim().toLowerCase() ?? "";
    if (username.length < 3) {
      return { success: false, error: "Username minimal 3 karakter." };
    }
    if (input.phone.replace(/\D/g, "").length < 8) {
      return { success: false, error: "Nomor telepon tidak valid." };
    }

    const db = await getTenantDb(session.dbConfig);

    // username must be unique within the tenant
    const clash = await db.t_member.findFirst({
      where: { companyId: session.companyId, username },
    });
    if (clash) {
      return { success: false, error: "Username sudah dipakai." };
    }

    const memberNo = genMemberNo();
    const tempPassword = genTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Resolve the membership plan (if any) for assignment + tier label.
    let planRow: {
      id: string;
      name: string;
      joinFee: number;
      includedCourtBookings: number;
      courtDiscountPct: number;
    } | null = null;
    if (input.planId) {
      const plan = await db.m_membership_plan.findFirst({
        where: { id: input.planId, companyId: session.companyId, active: true, ...NOT_DELETED },
      });
      if (!plan) return { success: false, error: "Plan membership tidak ditemukan." };
      planRow = {
        id: plan.id,
        name: plan.name,
        joinFee: plan.joinFee,
        includedCourtBookings: plan.includedCourtBookings,
        courtDiscountPct: plan.courtDiscountPct,
      };
    }

    // Whether the join fee is settled at registration (page checkout) or left
    // outstanding to be collected at the booking payment step (modal flow).
    const joinFeePaidNow = Boolean(planRow) && (planRow!.joinFee === 0 || input.collectJoinFee === true);
    const joinFeeCharged = joinFeePaidNow && planRow!.joinFee > 0 ? planRow!.joinFee : 0;

    const member = await db.$transaction(async (tx) => {
      // Member + membership + optional booking + payment are one atomic unit.
      const member = await tx.t_member.create({
        data: {
          companyId: session.companyId,
          memberNo,
          username,
          passwordHash,
          name: input.name.trim(),
          phone: input.phone,
          email: input.email?.trim() || null,
          tier: "daily",
          status: "active",
          onboarded: false,
          city: input.city?.trim() || null,
          ...auditCreate(session.userId),
        },
      });

      // 1. Membership FIRST (writes history; sets plan/quota/cycle on t_member).
      let historyId: string | undefined;
      if (planRow) {
        const hist = await applyMembershipAction(tx, {
          companyId: session.companyId,
          memberId: member.id,
          planId: planRow.id,
          action: "assign",
          actor: { kind: "staff", userId: session.userId },
          joinFee: joinFeeCharged,
          method: joinFeeCharged > 0 ? "Cash" : undefined,
          markJoinFeePaid: joinFeePaidNow,
        });
        historyId = hist.historyId;
      }

      // 2. Court bookings (pre-priced by the form) → one transaction header.
      let bookingId: string | undefined;
      let courtTotal = 0;
      if (input.bookings && input.bookings.length > 0) {
        const parsed = input.bookings.map((booking) => {
          const start = new Date(booking.start);
          const end = new Date(booking.end);
          quotaUnitsForDuration((end.getTime() - start.getTime()) / 60_000);
          if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            start <= new Date()
          ) {
            throw new Error("BOOKING_INVALID");
          }
          return { booking, start, end };
        });
        const courtIds = [...new Set(parsed.map((item) => item.booking.courtId))];
        const courts = await tx.m_court.findMany({
          where: {
            id: { in: courtIds },
            companyId: session.companyId,
            status: "active",
            ...NOT_DELETED,
          },
        });
        if (courts.length !== courtIds.length) throw new Error("COURT_UNAVAILABLE");
        const courtById = new Map(courts.map((court) => [court.id, court]));
        const priced = parsed.map((item) => {
          const court = courtById.get(item.booking.courtId);
          if (!court) throw new Error("COURT_UNAVAILABLE");
          const basePrice = calculateCourtBasePrice(
            {
              schedule: court.schedule as never,
              priceOffPeak: court.priceOffPeak,
              pricePeak: court.pricePeak,
            },
            item.start,
            item.end,
          );
          return { ...item, basePrice };
        });
        const conflictWindows = priced.map((item) => ({
          courtId: item.booking.courtId,
          start: { lt: item.end },
          end: { gt: item.start },
        }));
        const [bookingConflict, maintenanceConflict] = await Promise.all([
          tx.t_booking_detail.findFirst({
            where: {
              companyId: session.companyId,
              isDeleted: 0,
              status: { not: "cancelled" },
              OR: conflictWindows,
            },
            select: { id: true },
          }),
          tx.t_court_maintenance.findFirst({
            where: {
              companyId: session.companyId,
              isDeleted: 0,
              OR: conflictWindows,
            },
            select: { id: true },
          }),
        ]);
        if (bookingConflict || maintenanceConflict) {
          throw new Error("BOOKING_CONFLICT");
        }
        const benefit = calcMembershipBenefit({
          plan: planRow,
          quotaRemaining: planRow?.includedCourtBookings ?? 0,
          sessions: priced.map((item) => ({ basePrice: item.basePrice })),
        });
        courtTotal = benefit.payable;
        const quotaConsumed = benefit.quotaCoveredCount;
        const header = await tx.t_booking.create({
          data: {
            companyId: session.companyId,
            memberId: member.id,
            type: planRow ? "member" : "walk_in",
            status: "confirmed",
            customer: member.name,
            totalPrice: courtTotal,
            joinFee: 0, // join fee now lives in t_membership_history
            quotaConsumed,
            ...auditCreate(session.userId),
            details: {
              create: priced.map((item, index) => ({
                companyId: session.companyId,
                courtId: item.booking.courtId,
                start: item.start,
                end: item.end,
                partySize: Math.max(2, Math.min(4, item.booking.partySize || 4)),
                basePrice: item.basePrice,
                price: benefit.sessions[index].payable,
                rateNote: benefit.sessions[index].coveredByQuota
                  ? "free (quota)"
                  : benefit.sessions[index].discountPct > 0
                    ? "discount"
                    : "regular",
                status: "confirmed",
                note: item.booking.note ?? null,
                ...auditCreate(session.userId),
              })),
            },
          },
        });
        bookingId = header.id;
        if (planRow && quotaConsumed > 0) {
          await tx.t_member.update({
            where: { id: member.id },
            data: { quotaUsed: { increment: quotaConsumed }, ...auditUpdate(session.userId) },
          });
        }
      }

      // 3. One payment record for whatever was charged now; link it.
      const payable = joinFeeCharged + courtTotal;
      if (payable > 0) {
        const pay = await recordPayment(tx, {
          companyId: session.companyId,
          method: "Cash",
          membershipAmount: joinFeeCharged,
          courtAmount: courtTotal,
          paidByType: "staff",
          cashReceived: payable,
          actor: { kind: "staff", userId: session.userId },
        });
        if (historyId && joinFeeCharged > 0) {
          await tx.t_membership_history.update({
            where: { id: historyId },
            data: { paymentId: pay.id },
          });
        }
        if (bookingId) {
          await tx.t_booking.update({ where: { id: bookingId }, data: { paymentId: pay.id } });
        }
      }
      return member;
    });

    revalidatePath("/members");
    return { success: true, id: member.id, memberNo, username, tempPassword };
  } catch (err) {
    console.error("[registerMemberAction] error:", err);
    return { success: false, error: "Gagal mendaftarkan member." };
  }
}
