"use server";

// PadelHub — staff membership management actions (DB-backed). Staff (and owner)
// assign / extend / upgrade a member's plan from the membership menu. Cash is
// allowed here (front desk) and must be ≥ total; non-cash (QRIS/Transfer) is
// also accepted. All writes route through the shared checkout-core so history +
// payment are recorded consistently. RBAC is enforced here.

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant-db";
import { NOT_DELETED } from "@/lib/audit";
import { requirePermission, readSession } from "@/lib/access-guard";
import { runCheckout, type PayMethod } from "@/lib/checkout-core";

const MENU_KEY = "members.membership";

export type MembershipMemberRow = {
  id: string;
  memberNo: string;
  name: string;
  phone: string;
  planId: string | null;
  planName: string | null;
  planColor: string | null;
  quotaRemaining: number;
  quotaTotal: number;
};

export type MembershipPlanOption = {
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

export type MembershipHistoryRow = {
  id: string;
  action: string;
  planName: string;
  previousPlanName: string | null;
  joinFee: number;
  method: string | null;
  actorType: string;
  createdAt: string;
};

export type MembershipOverview = {
  member: {
    id: string;
    memberNo: string;
    name: string;
    phone: string;
    email: string | null;
  };
  status: {
    planId: string | null;
    planName: string | null;
    planColor: string | null;
    quotaTotal: number;
    quotaRemaining: number;
    courtDiscountPct: number;
    joinFee: number;
    resetAt: string | null;
    cycleStart: string | null;
  };
  plans: MembershipPlanOption[];
  history: MembershipHistoryRow[];
};

/** Searchable member list for the membership menu landing. */
export async function getMembershipMembersAction(q?: string): Promise<MembershipMemberRow[]> {
  const session = await readSession();
  if (!session) return [];
  const db = await getTenantDb(session.dbConfig);

  const term = (q ?? "").trim();
  const rows = await db.t_member.findMany({
    where: {
      companyId: session.companyId,
      ...NOT_DELETED,
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { memberNo: { contains: term, mode: "insensitive" } },
              { phone: { contains: term } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
    take: 100,
  });

  return rows.map((m) => {
    let quotaRemaining = 0;
    let quotaTotal = 0;
    if (m.plan && m.plan.isDeleted === 0) {
      let used = m.quotaUsed;
      if (m.plan.resetPeriodDays > 0 && m.cycleStart) {
        const elapsed = Math.floor((Date.now() - m.cycleStart.getTime()) / 86_400_000);
        if (elapsed >= m.plan.resetPeriodDays) {
          used = m.plan.includedCourtBookings;
        }
      }
      quotaTotal = m.plan.includedCourtBookings;
      quotaRemaining = Math.max(0, m.plan.includedCourtBookings - used);
    }
    return {
      id: m.id,
      memberNo: m.memberNo,
      name: m.name,
      phone: m.phone,
      planId: m.planId,
      planName: m.plan?.name ?? null,
      planColor: m.plan?.color ?? null,
      quotaRemaining,
      quotaTotal,
    };
  });
}

/** Membership detail for one member (summary + plans + history). */
export async function getMembershipOverviewAction(
  memberId: string,
): Promise<MembershipOverview | null> {
  const session = await readSession();
  if (!session) return null;
  const db = await getTenantDb(session.dbConfig);

  const m = await db.t_member.findFirst({
    where: { id: memberId, companyId: session.companyId, ...NOT_DELETED },
    include: { plan: true },
  });
  if (!m) return null;

  let status: MembershipOverview["status"] = {
    planId: null,
    planName: null,
    planColor: null,
    quotaTotal: 0,
    quotaRemaining: 0,
    courtDiscountPct: 0,
    joinFee: 0,
    resetAt: null,
    cycleStart: null,
  };
  if (m.plan && m.plan.isDeleted === 0) {
    let used = m.quotaUsed;
    let resetAt: string | null = null;
    if (m.plan.resetPeriodDays > 0 && m.cycleStart) {
      const elapsed = Math.floor((Date.now() - m.cycleStart.getTime()) / 86_400_000);
      if (elapsed >= m.plan.resetPeriodDays) used = m.plan.includedCourtBookings;
      const next = new Date(m.cycleStart);
      next.setDate(next.getDate() + m.plan.resetPeriodDays);
      resetAt = next.toISOString().slice(0, 10);
    }
    status = {
      planId: m.plan.id,
      planName: m.plan.name,
      planColor: m.plan.color,
      quotaTotal: m.plan.includedCourtBookings,
      quotaRemaining: Math.max(0, m.plan.includedCourtBookings - used),
      courtDiscountPct: m.plan.courtDiscountPct,
      joinFee: m.plan.joinFee,
      resetAt,
      cycleStart: m.cycleStart ? m.cycleStart.toISOString() : null,
    };
  }

  const planRows = await db.m_membership_plan.findMany({
    where: { companyId: session.companyId, active: true, ...NOT_DELETED },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const plans: MembershipPlanOption[] = planRows.map((p) => ({
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

  const historyRows = await db.t_membership_history.findMany({
    where: { companyId: session.companyId, memberId, ...NOT_DELETED },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const history: MembershipHistoryRow[] = historyRows.map((h) => ({
    id: h.id,
    action: h.action,
    planName: h.planName,
    previousPlanName: h.previousPlanName,
    joinFee: h.joinFee,
    method: h.method,
    actorType: h.actorType,
    createdAt: h.createdAt.toISOString(),
  }));

  return {
    member: {
      id: m.id,
      memberNo: m.memberNo,
      name: m.name,
      phone: m.phone,
      email: m.email,
    },
    status,
    plans,
    history,
  };
}

export type StaffMembershipActionResult = {
  success: boolean;
  error?: string;
  paymentRef?: string;
  joinFee?: number;
  change?: number;
};

type AssignInput = {
  memberId: string;
  planId: string;
  method: PayMethod;
  cashReceived?: number;
};
type ExtendInput = { memberId: string; method: PayMethod; cashReceived?: number };
type UpgradeInput = {
  memberId: string;
  planId: string;
  method: PayMethod;
  cashReceived?: number;
};

/** Shared guard + execution for staff-initiated membership actions. */
async function runStaffMembership(
  planAction: "assign" | "extend" | "upgrade",
  memberId: string,
  planId: string,
  method: PayMethod,
  cashReceived: number | undefined,
): Promise<StaffMembershipActionResult> {
  const action = planAction === "assign" ? "create" : "update";
  const guard = await requirePermission(MENU_KEY, action);
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;

  const db = await getTenantDb(session.dbConfig);
  const member = await db.t_member.findFirst({
    where: { id: memberId, companyId: session.companyId, ...NOT_DELETED },
  });
  if (!member) return { success: false, error: "Member tidak ditemukan." };

  const result = await runCheckout(db, {
    companyId: session.companyId,
    actor: { kind: "staff", userId: session.userId },
    method,
    memberId: member.id,
    customerName: member.name,
    membership: { planId, action: planAction },
    cashReceived,
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/members/membership");
  revalidatePath(`/members/membership/${memberId}`);
  revalidatePath("/members");
  return {
    success: true,
    paymentRef: result.paymentRef,
    joinFee: result.membershipAmount,
    change: result.change,
  };
}

/** Assign a plan to a member who has none. */
export async function assignPlanStaffAction(
  input: AssignInput,
): Promise<StaffMembershipActionResult> {
  const session = await readSession();
  if (!session) return { success: false, error: "Sesi tidak valid." };
  const db = await getTenantDb(session.dbConfig);
  const m = await db.t_member.findFirst({
    where: { id: input.memberId, companyId: session.companyId, ...NOT_DELETED },
    select: { planId: true },
  });
  if (m?.planId) {
    return { success: false, error: "Member sudah memiliki plan. Gunakan Perpanjang atau Upgrade." };
  }
  return runStaffMembership("assign", input.memberId, input.planId, input.method, input.cashReceived);
}

/** Extend a member's current plan (same plan, reset cycle + quota). */
export async function extendPlanStaffAction(
  input: ExtendInput,
): Promise<StaffMembershipActionResult> {
  const session = await readSession();
  if (!session) return { success: false, error: "Sesi tidak valid." };
  const db = await getTenantDb(session.dbConfig);
  const m = await db.t_member.findFirst({
    where: { id: input.memberId, companyId: session.companyId, ...NOT_DELETED },
    select: { planId: true },
  });
  if (!m?.planId) {
    return { success: false, error: "Member belum memiliki plan untuk diperpanjang." };
  }
  return runStaffMembership("extend", input.memberId, m.planId, input.method, input.cashReceived);
}

/** Upgrade a member to a different plan (replace plan, forfeit quota). */
export async function upgradePlanStaffAction(
  input: UpgradeInput,
): Promise<StaffMembershipActionResult> {
  const session = await readSession();
  if (!session) return { success: false, error: "Sesi tidak valid." };
  const db = await getTenantDb(session.dbConfig);
  const m = await db.t_member.findFirst({
    where: { id: input.memberId, companyId: session.companyId, ...NOT_DELETED },
    select: { planId: true },
  });
  if (!m?.planId) {
    return { success: false, error: "Member belum memiliki plan. Gunakan Assign." };
  }
  if (m.planId === input.planId) {
    return { success: false, error: "Pilih plan yang berbeda untuk upgrade." };
  }
  return runStaffMembership("upgrade", input.memberId, input.planId, input.method, input.cashReceived);
}
