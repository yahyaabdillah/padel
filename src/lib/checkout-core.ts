// PadelHub — shared checkout core. The single place that orders a combined
// membership + court-booking + payment checkout inside ONE database
// transaction. Used by staff registration, the booking quick-add modal, the
// staff membership surface, and the member self-service surfaces, so the rules
// (plan-before-court, join-fee → t_membership_history, one t_payment per
// checkout) live in exactly one place.
//
// RBAC is NOT enforced here — the calling server action guards first, then
// invokes the core. Member callers must additionally assert own-account.

import type { PrismaClient, Prisma } from "@prisma/tenant-client";
import { calcMembershipBenefit } from "@/lib/membership-benefit";
import { resolveMembershipQuotaCycle } from "@/lib/membership-quota";

type Tx = Prisma.TransactionClient;

export type PayMethod = "Cash" | "QRIS" | "Transfer";
export const NON_CASH_METHODS: PayMethod[] = ["QRIS", "Transfer"];
/** Methods a member (self-service) may use — never cash. */
export const MEMBER_NON_CASH: PayMethod[] = ["QRIS", "Transfer"];

export type MembershipActionKind = "assign" | "extend" | "upgrade";
export type ActorKind = "staff" | "member";

export interface CheckoutActor {
  kind: ActorKind;
  /** createdBy/updatedBy stamp (m_user.userId or member username) */
  userId: string;
}

/** One court session to book (charged price is computed by the core). */
export interface CheckoutBookingInput {
  courtId: string;
  start: string; // ISO
  end: string; // ISO
  partySize: number;
  /** court rate before benefit (peak-aware), computed by the caller */
  basePrice: number;
  rateNote?: string;
  note?: string;
}

export interface MembershipChangeInput {
  planId: string;
  action: MembershipActionKind;
}

export interface RunCheckoutArgs {
  companyId: string;
  actor: CheckoutActor;
  method: PayMethod;
  memberId: string; // the member the checkout is for
  customerName: string;
  /** optional membership change applied BEFORE court pricing */
  membership?: MembershipChangeInput;
  /** optional court sessions */
  bookings?: CheckoutBookingInput[];
  /** cash tendered (staff cash only) */
  cashReceived?: number;
}

export interface CheckoutResult {
  success: boolean;
  error?: string;
  paymentRef?: string;
  membershipAmount?: number;
  courtAmount?: number;
  total?: number;
  change?: number;
  bookingId?: string;
  historyId?: string;
  paymentId?: string;
  /** true when all booked sessions were covered by quota */
  fullyCoveredByQuota?: boolean;
}

/** Generate a tenant-unique-ish payment reference. */
export function genPaymentRef(): string {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `PAY-${y}-${rand}`;
}

/* ════════════════════════════════════════════════════════
 *  Member benefit resolution (cycle rollover)
 * ════════════════════════════════════════════════════════ */

export interface ResolvedBenefit {
  plan: { includedCourtBookings: number; courtDiscountPct: number } | null;
  planName: string | null;
  quotaRemaining: number;
  joinFeeDue: number;
  resetPeriodDays: number;
  shouldStartNewQuotaCycle: boolean;
}

/** Resolve a member's live plan benefit, rolling the cycle if elapsed. */
export async function resolveMemberBenefit(
  tx: Tx | PrismaClient,
  companyId: string,
  memberId: string,
): Promise<ResolvedBenefit> {
  const m = await tx.t_member.findFirst({
    where: { id: memberId, companyId, isDeleted: 0 },
    include: { plan: true },
  });
  if (!m || !m.plan || m.plan.isDeleted !== 0) {
    return {
      plan: null,
      planName: null,
      quotaRemaining: 0,
      joinFeeDue: 0,
      resetPeriodDays: 0,
      shouldStartNewQuotaCycle: false,
    };
  }
  const quotaCycle = resolveMembershipQuotaCycle({
    quotaUsed: m.quotaUsed,
    cycleStart: m.cycleStart,
    resetPeriodDays: m.plan.resetPeriodDays,
  });
  return {
    plan: {
      includedCourtBookings: m.plan.includedCourtBookings,
      courtDiscountPct: m.plan.courtDiscountPct,
    },
    planName: m.plan.name,
    quotaRemaining: Math.max(
      0,
      m.plan.includedCourtBookings - quotaCycle.effectiveQuotaUsed,
    ),
    joinFeeDue: m.joinFeePaid ? 0 : m.plan.joinFee,
    resetPeriodDays: m.plan.resetPeriodDays,
    shouldStartNewQuotaCycle: quotaCycle.shouldStartNewCycle,
  };
}

/* ════════════════════════════════════════════════════════
 *  Membership action (assign | extend | upgrade)
 * ════════════════════════════════════════════════════════ */

export interface ApplyMembershipArgs {
  companyId: string;
  memberId: string;
  planId: string;
  action: MembershipActionKind;
  actor: CheckoutActor;
  /** join fee charged for this action (0 = free) */
  joinFee: number;
  method?: PayMethod;
  /** payment record id to link (when joinFee > 0) */
  paymentId?: string;
  /** override the joinFeePaid flag set on t_member (defaults true). Set false
   * when a plan is assigned but its join fee is collected later. */
  markJoinFeePaid?: boolean;
}

export interface MembershipActionResult {
  historyId: string;
  joinFee: number;
  planName: string;
}

/**
 * Apply a membership action to t_member and write a t_membership_history row.
 * Never writes t_booking.joinFee. Must run inside a transaction when combined
 * with a booking.
 */
export async function applyMembershipAction(
  tx: Tx,
  args: ApplyMembershipArgs,
): Promise<MembershipActionResult> {
  const { companyId, memberId, planId, action, actor } = args;

  const member = await tx.t_member.findFirst({
    where: { id: memberId, companyId, isDeleted: 0 },
    include: { plan: true },
  });
  if (!member) throw new Error("MEMBER_NOT_FOUND");

  const plan = await tx.m_membership_plan.findFirst({
    where: { id: planId, companyId, active: true, isDeleted: 0 },
  });
  if (!plan) throw new Error("PLAN_NOT_FOUND");

  const now = new Date();
  const previousPlanId = member.planId;
  const previousPlanName = member.plan?.name ?? null;

  // assign/extend/upgrade all reset cycle + quota to the new/refreshed plan.
  await tx.t_member.update({
    where: { id: member.id },
    data: {
      planId: plan.id,
      tier: plan.name.toLowerCase(),
      cycleStart: now,
      quotaUsed: 0,
      coachingUsed: 0,
      joinFeePaid: args.markJoinFeePaid ?? true,
      updatedBy: actor.userId,
    },
  });

  const history = await tx.t_membership_history.create({
    data: {
      companyId,
      memberId: member.id,
      planId: plan.id,
      planName: plan.name,
      action,
      previousPlanId: action === "upgrade" ? previousPlanId : null,
      previousPlanName: action === "upgrade" ? previousPlanName : null,
      joinFee: args.joinFee,
      method: args.joinFee > 0 ? args.method ?? null : null,
      paymentId: args.joinFee > 0 ? args.paymentId ?? null : null,
      actorType: actor.kind,
      cycleStart: now,
      createdBy: actor.userId,
    },
  });

  return { historyId: history.id, joinFee: args.joinFee, planName: plan.name };
}

/* ════════════════════════════════════════════════════════
 *  Payment record
 * ════════════════════════════════════════════════════════ */

export interface RecordPaymentArgs {
  companyId: string;
  method: PayMethod;
  membershipAmount: number;
  courtAmount: number;
  paidByType: ActorKind;
  cashReceived?: number;
  actor: CheckoutActor;
}

export async function recordPayment(
  tx: Tx,
  args: RecordPaymentArgs,
): Promise<{ id: string; paymentRef: string; change: number }> {
  const total = args.membershipAmount + args.courtAmount;
  const change =
    args.method === "Cash" && typeof args.cashReceived === "number"
      ? Math.max(0, args.cashReceived - total)
      : 0;
  const paymentRef = genPaymentRef();
  const row = await tx.t_payment.create({
    data: {
      companyId: args.companyId,
      paymentRef,
      method: args.method,
      amount: total,
      membershipAmount: args.membershipAmount,
      courtAmount: args.courtAmount,
      status: "paid",
      paidByType: args.paidByType,
      cashReceived: args.method === "Cash" ? args.cashReceived ?? null : null,
      cashChange: args.method === "Cash" ? change : null,
      paidAt: new Date(),
      createdBy: args.actor.userId,
    },
  });
  return { id: row.id, paymentRef, change };
}

/* ════════════════════════════════════════════════════════
 *  Orchestrator
 * ════════════════════════════════════════════════════════ */

/**
 * Run a combined checkout in ONE transaction:
 *   1. validate method for the actor
 *   2. apply membership FIRST (so court pricing sees the new plan)
 *   3. re-resolve benefit, price + persist court bookings (overlap guard)
 *   4. enforce cash >= total (staff cash)
 *   5. record one payment, link it to the history/booking
 * Throws → full rollback. Returns a structured result.
 */
export async function runCheckout(
  db: PrismaClient,
  args: RunCheckoutArgs,
): Promise<CheckoutResult> {
  // 1. method validation
  if (args.actor.kind === "member" && !NON_CASH_METHODS.includes(args.method)) {
    return { success: false, error: "Pembayaran tunai hanya tersedia di front desk." };
  }

  const bookings = args.bookings ?? [];
  if (!args.membership && bookings.length === 0) {
    return { success: false, error: "Tidak ada yang dibayar." };
  }

  try {
    const out = await db.$transaction(async (tx) => {
      let membershipAmount = 0;
      let historyId: string | undefined;

      // 2. membership FIRST
      if (args.membership) {
        const plan = await tx.m_membership_plan.findFirst({
          where: { id: args.membership.planId, companyId: args.companyId, active: true, isDeleted: 0 },
        });
        if (!plan) throw new Error("PLAN_NOT_FOUND");
        membershipAmount = plan.joinFee;
        const res = await applyMembershipAction(tx, {
          companyId: args.companyId,
          memberId: args.memberId,
          planId: args.membership.planId,
          action: args.membership.action,
          actor: args.actor,
          joinFee: plan.joinFee,
          method: args.method,
        });
        historyId = res.historyId;
      }

      // 3. court bookings — price with the (possibly just-applied) plan
      let courtAmount = 0;
      let bookingId: string | undefined;
      let quotaConsumed = 0;
      let fullyCovered = false;

      if (bookings.length > 0) {
        const benefit = await resolveMemberBenefit(tx, args.companyId, args.memberId);

        const priced = calcMembershipBenefit({
          plan: benefit.plan,
          quotaRemaining: benefit.quotaRemaining,
          sessions: bookings.map((b) => ({ basePrice: b.basePrice })),
        });

        // overlap guard per court
        for (const b of bookings) {
          const start = new Date(b.start);
          const end = new Date(b.end);
          const clash = await tx.t_booking_detail.findFirst({
            where: {
              companyId: args.companyId,
              courtId: b.courtId,
              isDeleted: 0,
              status: { not: "cancelled" },
              start: { lt: end },
              end: { gt: start },
            },
            select: { id: true, start: true },
          });
          if (clash) {
            throw new Error(`SLOT_TAKEN:${b.courtId}:${b.start}`);
          }
        }

        courtAmount = priced.payable;
        quotaConsumed = priced.quotaCoveredCount;
        fullyCovered = priced.payable === 0 && bookings.length > 0;

        const header = await tx.t_booking.create({
          data: {
            companyId: args.companyId,
            memberId: args.memberId,
            type: "member",
            status: "confirmed",
            customer: args.customerName,
            paymentMethod: args.method,
            totalPrice: courtAmount,
            joinFee: 0, // join fee is NOT recorded here anymore
            quotaConsumed,
            createdBy: args.actor.userId,
            details: {
              create: bookings.map((b, i) => ({
                companyId: args.companyId,
                courtId: b.courtId,
                start: new Date(b.start),
                end: new Date(b.end),
                partySize: Math.max(2, Math.min(4, b.partySize || 4)),
                basePrice: b.basePrice,
                price: priced.sessions[i].payable,
                rateNote:
                  priced.sessions[i].coveredByQuota
                    ? "free (quota)"
                    : priced.sessions[i].discountPct > 0
                      ? "discount"
                      : b.rateNote ?? "regular",
                status: "confirmed",
                note: b.note ?? null,
                createdBy: args.actor.userId,
              })),
            },
          },
        });
        bookingId = header.id;

        if (quotaConsumed > 0) {
          await tx.t_member.update({
            where: { id: args.memberId },
            data: {
              quotaUsed: benefit.shouldStartNewQuotaCycle
                ? quotaConsumed
                : { increment: quotaConsumed },
              ...(benefit.shouldStartNewQuotaCycle && {
                cycleStart: new Date(),
              }),
              updatedBy: args.actor.userId,
            },
          });
        }
      }

      // 4. cash sufficiency (staff cash)
      const total = membershipAmount + courtAmount;
      if (args.method === "Cash") {
        const received = args.cashReceived ?? 0;
        if (received < total) throw new Error("CASH_SHORT");
      }

      // 5. one payment record, link it
      const pay = await recordPayment(tx, {
        companyId: args.companyId,
        method: args.method,
        membershipAmount,
        courtAmount,
        paidByType: args.actor.kind,
        cashReceived: args.cashReceived,
        actor: args.actor,
      });

      if (historyId) {
        await tx.t_membership_history.update({
          where: { id: historyId },
          data: { paymentId: membershipAmount > 0 ? pay.id : null },
        });
      }
      if (bookingId) {
        await tx.t_booking.update({ where: { id: bookingId }, data: { paymentId: pay.id } });
      }

      return {
        paymentRef: pay.paymentRef,
        paymentId: pay.id,
        membershipAmount,
        courtAmount,
        total,
        change: pay.change,
        bookingId,
        historyId,
        fullyCoveredByQuota: fullyCovered,
      };
    }, { isolationLevel: "Serializable" });

    return { success: true, ...out };
  } catch (err) {
    return { success: false, error: mapCheckoutError(err) };
  }
}

function mapCheckoutError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === "PLAN_NOT_FOUND") return "Plan membership tidak ditemukan.";
  if (msg === "MEMBER_NOT_FOUND") return "Member tidak ditemukan.";
  if (msg === "CASH_SHORT") return "Uang tunai kurang dari total.";
  if (msg.startsWith("SLOT_TAKEN")) return "Slot sudah ter-booking. Pilih waktu lain.";
  console.error("[runCheckout] error:", err);
  return "Gagal memproses checkout.";
}
