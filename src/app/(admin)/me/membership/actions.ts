"use server";

// PadelHub — member self-service membership actions (DB-backed). The acting
// member is resolved from the session (role === "member", id === t_member.id).
// Members may BUY (no current plan), EXTEND (same plan), or UPGRADE (different
// plan) their membership. Payment is non-cash only (cash goes through staff at
// the desk). All writes route through the shared checkout-core so history +
// payment are recorded consistently. RBAC is enforced here.

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant-db";
import type { AuthSession } from "@/lib/auth-types";
import { NOT_DELETED } from "@/lib/audit";
import { readSession, requirePermission } from "@/lib/access-guard";
import { runCheckout, MEMBER_NON_CASH, type PayMethod } from "@/lib/checkout-core";
import {
  buildMidtransOrderId,
  createMidtransSnapTransaction,
  getMidtransTransactionStatus,
  isMidtransPaymentSettled,
  midtransOrderBelongsToCompany,
} from "@/lib/midtrans";
import { resolveMidtransConfig } from "@/lib/midtrans-config";

async function requireMemberSession(): Promise<AuthSession | null> {
  const session = await readSession();
  return session?.role === "member" ? session : null;
}

export type MyPlanOption = {
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

export type MyMembershipStatus = {
  planId: string | null;
  planName: string | null;
  planColor: string | null;
  quotaTotal: number;
  quotaRemaining: number;
  courtDiscountPct: number;
  joinFee: number;
  resetAt: string | null;
  cycleStart: string | null;
  active: boolean;
};

export type MyMembershipHistoryRow = {
  id: string;
  action: string; // assign | extend | upgrade
  planName: string;
  previousPlanName: string | null;
  joinFee: number;
  method: string | null;
  actorType: string; // staff | member
  createdAt: string;
};

export type MyMembershipData = {
  status: MyMembershipStatus;
  plans: MyPlanOption[];
  history: MyMembershipHistoryRow[];
};

/** Current plan + active plans + own history for the member portal. */
export async function getMyMembershipAction(): Promise<MyMembershipData | null> {
  const session = await requireMemberSession();
  if (!session) return null;
  const db = await getTenantDb(session.dbConfig);

  const m = await db.t_member.findFirst({
    where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
    include: { plan: true },
  });

  let status: MyMembershipStatus = {
    planId: null,
    planName: null,
    planColor: null,
    quotaTotal: 0,
    quotaRemaining: 0,
    courtDiscountPct: 0,
    joinFee: 0,
    resetAt: null,
    cycleStart: null,
    active: false,
  };
  if (m?.plan && m.plan.isDeleted === 0) {
    let used = m.quotaUsed;
    let active = true;
    let resetAt: string | null = null;
    if (m.plan.resetPeriodDays > 0 && m.cycleStart) {
      const elapsed = Math.floor((Date.now() - m.cycleStart.getTime()) / 86_400_000);
      if (elapsed >= m.plan.resetPeriodDays) {
        used = m.plan.includedCourtBookings;
        active = false;
      }
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
      courtDiscountPct: active ? m.plan.courtDiscountPct : 0,
      joinFee: m.plan.joinFee,
      resetAt,
      cycleStart: m.cycleStart ? m.cycleStart.toISOString() : null,
      active,
    };
  }

  const planRows = await db.m_membership_plan.findMany({
    where: { companyId: session.companyId, active: true, ...NOT_DELETED },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const plans: MyPlanOption[] = planRows.map((p) => ({
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
    where: { companyId: session.companyId, memberId: session.id, ...NOT_DELETED },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const history: MyMembershipHistoryRow[] = historyRows.map((h) => ({
    id: h.id,
    action: h.action,
    planName: h.planName,
    previousPlanName: h.previousPlanName,
    joinFee: h.joinFee,
    method: h.method,
    actorType: h.actorType,
    createdAt: h.createdAt.toISOString(),
  }));

  return { status, plans, history };
}

export type MyMembershipActionResult = {
  success: boolean;
  error?: string;
  paymentRef?: string;
  joinFee?: number;
};

type BuyInput = { planId: string; method: PayMethod; providerOrderId?: string };
type ExtendInput = { method: PayMethod; providerOrderId?: string };
type UpgradeInput = { planId: string; method: PayMethod; providerOrderId?: string };

/** Shared guard + execution for member-initiated membership actions. */
async function runMemberMembership(
  planAction: "assign" | "extend" | "upgrade",
  planId: string,
  method: PayMethod,
  providerOrderId?: string,
): Promise<MyMembershipActionResult> {
  const guard = await requirePermission("portal.membership", "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  if (session.role !== "member") {
    return { success: false, error: "Hanya member yang dapat melakukan aksi ini." };
  }
  if (!MEMBER_NON_CASH.includes(method)) {
    return { success: false, error: "Pembayaran tunai hanya tersedia di front desk." };
  }

  const db = await getTenantDb(session.dbConfig);
  const member = await db.t_member.findFirst({
    where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
  });
  if (!member) return { success: false, error: "Member tidak ditemukan." };
  const plan = await db.m_membership_plan.findFirst({
    where: {
      id: planId,
      companyId: session.companyId,
      active: true,
      ...NOT_DELETED,
    },
  });
  if (!plan) return { success: false, error: "Plan tidak ditemukan." };
  let verifiedAmount: number | undefined;
  if (plan.joinFee > 0) {
    if (
      !providerOrderId ||
      !midtransOrderBelongsToCompany(providerOrderId, session.companyId)
    ) {
      return { success: false, error: "Referensi pembayaran Midtrans tidak valid." };
    }
    try {
      const config = await resolveMidtransConfig(db, session.companyId);
      const status = await getMidtransTransactionStatus(config, providerOrderId);
      verifiedAmount = Number(status.gross_amount);
      if (
        status.order_id !== providerOrderId ||
        !isMidtransPaymentSettled(status) ||
        !Number.isSafeInteger(verifiedAmount) ||
        verifiedAmount !== plan.joinFee
      ) {
        return { success: false, error: "Pembayaran Midtrans belum lunas atau nominal tidak sesuai." };
      }
    } catch (err) {
      console.error("[runMemberMembership] Midtrans verification:", err);
      return { success: false, error: "Status pembayaran Midtrans belum dapat diverifikasi." };
    }
  }

  const result = await runCheckout(db, {
    companyId: session.companyId,
    actor: { kind: "member", userId: session.userId },
    method,
    memberId: member.id, // own-account: always the session member
    customerName: member.name,
    membership: { planId, action: planAction },
    providerConfirmationId: providerOrderId,
    expectedProviderAmount: verifiedAmount,
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/me/membership");
  revalidatePath("/me/book");
  revalidatePath("/me/checkin");
  return { success: true, paymentRef: result.paymentRef, joinFee: result.membershipAmount };
}

/** Buy a plan when the member currently has none. */
export async function buyMyMembershipAction(input: BuyInput): Promise<MyMembershipActionResult> {
  const session = await requireMemberSession();
  if (!session) return { success: false, error: "Sesi tidak valid." };
  const db = await getTenantDb(session.dbConfig);
  const m = await db.t_member.findFirst({
    where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
    select: { planId: true },
  });
  if (m?.planId) {
    return { success: false, error: "Anda sudah memiliki plan. Gunakan Perpanjang atau Upgrade." };
  }
  return runMemberMembership("assign", input.planId, input.method, input.providerOrderId);
}

/** Extend the current plan (same plan, reset cycle + full quota). */
export async function extendMyMembershipAction(input: ExtendInput): Promise<MyMembershipActionResult> {
  const session = await requireMemberSession();
  if (!session) return { success: false, error: "Sesi tidak valid." };
  const db = await getTenantDb(session.dbConfig);
  const m = await db.t_member.findFirst({
    where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
    select: { planId: true },
  });
  if (!m?.planId) {
    return { success: false, error: "Anda belum memiliki plan untuk diperpanjang." };
  }
  return runMemberMembership("extend", m.planId, input.method, input.providerOrderId);
}

/** Upgrade to a different plan (replace plan, forfeit remaining quota). */
export async function upgradeMyMembershipAction(input: UpgradeInput): Promise<MyMembershipActionResult> {
  const session = await requireMemberSession();
  if (!session) return { success: false, error: "Sesi tidak valid." };
  const db = await getTenantDb(session.dbConfig);
  const m = await db.t_member.findFirst({
    where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
    select: { planId: true },
  });
  if (!m?.planId) {
    return { success: false, error: "Anda belum memiliki plan. Gunakan Beli." };
  }
  if (m.planId === input.planId) {
    return { success: false, error: "Pilih plan yang berbeda untuk upgrade." };
  }
  return runMemberMembership("upgrade", input.planId, input.method, input.providerOrderId);
}

export async function startMyMembershipMidtransAction(input: {
  kind: "buy" | "extend" | "upgrade";
  planId?: string;
  method: PayMethod;
}): Promise<{
  success: boolean;
  error?: string;
  free?: boolean;
  token?: string;
  orderId?: string;
  clientKey?: string;
  production?: boolean;
}> {
  const guard = await requirePermission("portal.membership", "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  if (session.role !== "member") return { success: false, error: "Sesi member tidak valid." };
  try {
    const db = await getTenantDb(session.dbConfig);
    const member = await db.t_member.findFirst({
      where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
      select: { planId: true, name: true, email: true, phone: true },
    });
    if (!member) return { success: false, error: "Member tidak ditemukan." };
    const planId = input.kind === "extend" ? member.planId : input.planId;
    if (!planId) return { success: false, error: "Plan tidak ditemukan." };
    const plan = await db.m_membership_plan.findFirst({
      where: { id: planId, companyId: session.companyId, active: true, ...NOT_DELETED },
    });
    if (!plan) return { success: false, error: "Plan tidak ditemukan." };
    if (plan.joinFee === 0) return { success: true, free: true };
    const config = await resolveMidtransConfig(db, session.companyId);
    const orderId = buildMidtransOrderId(session.companyId);
    const snap = await createMidtransSnapTransaction(config, {
      orderId,
      grossAmount: plan.joinFee,
      customer: { firstName: member.name, email: member.email, phone: member.phone },
      itemDetails: [{
        id: `MEMBERSHIP-${plan.id.slice(0, 24)}`,
        name: `Join membership ${plan.name}`.slice(0, 50),
        price: plan.joinFee,
        quantity: 1,
      }],
    });
    return {
      success: true,
      token: snap.token,
      orderId,
      clientKey: config.clientKey,
      production: config.production,
    };
  } catch (err) {
    console.error("[startMyMembershipMidtransAction] error:", err);
    return { success: false, error: "Gagal memulai pembayaran Midtrans membership." };
  }
}
