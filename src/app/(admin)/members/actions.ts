"use server";

import { cookies } from "next/headers";
import * as bcrypt from "bcryptjs";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";
import { auditCreate, auditSoftDelete, auditUpdate, NOT_DELETED } from "@/lib/audit";
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
  /** plain password chosen at registration (hashed server-side) */
  password: string;
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
  const session = await requireSession();
  if (!session) return { success: false, error: "Not authenticated." };
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
  const session = await requireSession();
  if (!session) return { success: false, error: "Not authenticated." };
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
): Promise<{ success: boolean }> {
  const session = await requireSession();
  if (!session) return { success: false };
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
    const session = await requireSession();
    if (!session) return { success: false, error: "Not authenticated." };

    if (!input.name?.trim() || input.name.trim().length < 2) {
      return { success: false, error: "Nama minimal 2 karakter." };
    }
    const username = input.username?.trim().toLowerCase() ?? "";
    if (username.length < 3) {
      return { success: false, error: "Username minimal 3 karakter." };
    }
    if (!input.password || input.password.length < 6) {
      return { success: false, error: "Password minimal 6 karakter." };
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
    const passwordHash = await bcrypt.hash(input.password, 10);

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
    return { success: true, id: member.id, memberNo, username };
  } catch (err) {
    console.error("[registerMemberAction] error:", err);
    return { success: false, error: "Gagal mendaftarkan member." };
  }
}
