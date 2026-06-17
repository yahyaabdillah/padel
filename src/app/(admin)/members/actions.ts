"use server";

import { cookies } from "next/headers";
import * as bcrypt from "bcryptjs";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";
import { auditCreate, auditSoftDelete, auditUpdate, NOT_DELETED } from "@/lib/audit";
import { requirePermission } from "@/lib/access-guard";
import { revalidatePath } from "next/cache";

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

async function requireSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

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
  const session = await requireSession();
  if (!session) return [];
  const db = await getTenantDb();
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
  const session = await requireSession();
  if (!session) return [];
  const db = await getTenantDb();
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
  const session = await requireSession();
  if (!session) return [];

  const db = await getTenantDb();
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

/** Assign (or clear) a member's membership plan. Resets the quota cycle. */
export async function assignMemberPlanAction(
  memberId: string,
  planId: string | null,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("members.data", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();

  // resolve the plan name for the legacy `tier` display field
  let tier = "daily";
  if (planId) {
    const plan = await db.m_membership_plan.findFirst({
      where: { id: planId, companyId: session.companyId, isDeleted: 0 },
    });
    if (!plan) return { success: false, error: "Plan tidak ditemukan." };
    tier = plan.name.toLowerCase();
  }

  await db.t_member.updateMany({
    where: { id: memberId, companyId: session.companyId, ...NOT_DELETED },
    data: {
      planId,
      tier,
      cycleStart: planId ? new Date() : null,
      quotaUsed: 0,
      coachingUsed: 0,
      ...auditUpdate(session.userId),
    },
  });
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
  const db = await getTenantDb();
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
  const db = await getTenantDb();
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
  const session = await requireSession();
  if (!session) return { available: false };
  const u = username.trim().toLowerCase();
  if (u.length < 3) return { available: false };
  const db = await getTenantDb();
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
  const db = await getTenantDb();
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
  const db = await getTenantDb();

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

    const db = await getTenantDb();

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
    let planId: string | null = null;
    let tier = "daily";
    let joinFee = 0;
    if (input.planId) {
      const plan = await db.m_membership_plan.findFirst({
        where: { id: input.planId, companyId: session.companyId, active: true, ...NOT_DELETED },
      });
      if (!plan) return { success: false, error: "Plan membership tidak ditemukan." };
      planId = plan.id;
      tier = plan.name.toLowerCase();
      joinFee = plan.joinFee;
    }

    // Whether the join fee is settled at registration (page checkout) or left
    // outstanding to be collected at the booking payment step (modal flow).
    const joinFeePaidNow = Boolean(planId) && (joinFee === 0 || input.collectJoinFee === true);

    const member = await db.t_member.create({
      data: {
        companyId: session.companyId,
        memberNo,
        username,
        passwordHash,
        name: input.name.trim(),
        phone: input.phone,
        email: input.email?.trim() || null,
        tier,
        status: "active",
        onboarded: false,
        city: input.city?.trim() || null,
        planId,
        cycleStart: planId ? new Date() : null,
        quotaUsed: 0,
        coachingUsed: 0,
        joinFeePaid: joinFeePaidNow,
        ...auditCreate(session.userId),
      },
    });

    // Join fee collected at registration checkout is recorded on the booking
    // header (court bookings) or as a standalone fee-only transaction.
    const joinFeeCharged = joinFeePaidNow && joinFee > 0 ? joinFee : 0;

    // Court bookings (the only thing paid for at registration) → one
    // transaction header + a detail line per session.
    if (input.bookings && input.bookings.length > 0) {
      const first = input.bookings[0];
      const courtTotal = input.bookings.reduce((s, b) => s + b.price, 0);
      // count free (quota-covered) sessions to burn on the member's quota
      const quotaConsumed = input.bookings.filter((b) => b.price === 0).length;
      await db.t_booking.create({
        data: {
          companyId: session.companyId,
          memberId: member.id,
          type: first.type,
          status: first.status,
          customer: first.customer,
          totalPrice: courtTotal + joinFeeCharged,
          joinFee: joinFeeCharged,
          quotaConsumed,
          note: joinFeeCharged > 0 ? `Termasuk join fee ${joinFeeCharged}` : null,
          ...auditCreate(session.userId),
          details: {
            create: input.bookings.map((b) => ({
              companyId: session.companyId,
              courtId: b.courtId,
              start: new Date(b.start),
              end: new Date(b.end),
              partySize: b.partySize,
              basePrice: b.price,
              price: b.price,
              status: b.status,
              note: b.note ?? null,
              ...auditCreate(b.createdBy || session.userId),
            })),
          },
        },
      });
      // burn membership quota consumed by free court sessions at registration
      if (planId && quotaConsumed > 0) {
        await db.t_member.update({
          where: { id: member.id },
          data: { quotaUsed: { increment: quotaConsumed }, ...auditUpdate(session.userId) },
        });
      }
    } else if (joinFeeCharged > 0) {
      // No court bookings, but join fee paid now → standalone fee transaction.
      await db.t_booking.create({
        data: {
          companyId: session.companyId,
          memberId: member.id,
          type: "member",
          status: "completed",
          customer: input.name.trim(),
          totalPrice: joinFeeCharged,
          joinFee: joinFeeCharged,
          note: "Join fee membership",
          ...auditCreate(session.userId),
        },
      });
    }

    revalidatePath("/members");
    return { success: true, id: member.id, memberNo, username, tempPassword };
  } catch (err) {
    console.error("[registerMemberAction] error:", err);
    return { success: false, error: "Gagal mendaftarkan member." };
  }
}
