// PadelHub — membership benefit calculator (pure, framework-agnostic).
// Single source of truth for "how much does a member actually pay" given their
// plan benefits + remaining quota. Usable on the server (actions) or client
// (booking/registration/payment UIs). No React, no DB, no side effects.
//
// Benefit model (see MembershipPlan):
//  • includedCourtBookings : N court sessions per cycle are FREE (quota).
//      Quota covers any court/hour, peak included. Applied to the most
//      expensive sessions first so the member saves the most.
//  • courtDiscountPct      : % off the court rate for sessions NOT covered by
//      quota (i.e. after quota is exhausted).
//
// More benefit levers can be added here later (peak-only discount, flat
// credit, etc.) without touching call sites.

/** The subset of a membership plan the calculator needs. */
export interface BenefitPlan {
  /** free court sessions per cycle */
  includedCourtBookings: number;
  /** % discount on court rate after quota is used up (0–100) */
  courtDiscountPct: number;
}

/** One court session being priced. */
export interface BenefitSessionInput {
  /** the court rate for this session (peak-aware), in IDR */
  basePrice: number;
  /** optional label for UI (e.g. "17:00–18:00") */
  label?: string;
}

/** Inputs for a benefit calculation. */
export interface BenefitInput {
  /** the member's plan, or null for non-members / walk-ins */
  plan?: BenefitPlan | null;
  /** free quota still available this cycle (defaults to the plan's full quota) */
  quotaRemaining?: number;
  /** sessions to price */
  sessions: BenefitSessionInput[];
  /** one-time membership join fee to collect in THIS checkout (IDR). 0/omit
   * when the join fee is already paid or there is no plan. Added on top of the
   * court payable — it is not a court charge and is never discounted. */
  joinFee?: number;
}

/** Per-session pricing outcome. */
export interface BenefitSessionResult {
  label?: string;
  basePrice: number;
  /** covered for free by membership quota */
  coveredByQuota: boolean;
  /** discount % applied (0 when covered by quota or no discount) */
  discountPct: number;
  /** amount saved on this session (quota or discount) */
  saved: number;
  /** final amount payable for this session */
  payable: number;
}

/** Full breakdown returned to callers. */
export interface BenefitResult {
  sessions: BenefitSessionResult[];
  /** sum of all base prices (before benefits) */
  subtotal: number;
  /** number of sessions covered free by quota */
  quotaCoveredCount: number;
  /** IDR saved via quota */
  quotaSavings: number;
  /** IDR saved via the post-quota discount */
  discountSavings: number;
  /** total IDR saved (quota + discount) */
  totalSavings: number;
  /** court total payable after benefits (before join fee) */
  payable: number;
  /** one-time join fee collected in this checkout (IDR) */
  joinFee: number;
  /** the amount actually charged in this checkout = payable + joinFee */
  grandTotal: number;
  /** quota left after this calculation */
  quotaRemainingAfter: number;
}

const clampPct = (n: number) => Math.min(100, Math.max(0, n));


/**
 * Compute the payable total + savings for a set of court sessions under a
 * member's plan. Quota is applied to the most expensive sessions first; the
 * post-quota discount applies to the remaining sessions.
 */
export function calcMembershipBenefit(input: BenefitInput): BenefitResult {
  const { plan, sessions } = input;
  const joinFee = Math.max(0, input.joinFee ?? 0);
  const subtotal = sessions.reduce((s, x) => s + Math.max(0, x.basePrice), 0);

  // No plan → pay full price, no benefits.
  if (!plan) {
    return {
      sessions: sessions.map((s) => ({
        label: s.label,
        basePrice: s.basePrice,
        coveredByQuota: false,
        discountPct: 0,
        saved: 0,
        payable: s.basePrice,
      })),
      subtotal,
      quotaCoveredCount: 0,
      quotaSavings: 0,
      discountSavings: 0,
      totalSavings: 0,
      payable: subtotal,
      joinFee,
      grandTotal: subtotal + joinFee,
      quotaRemainingAfter: 0,
    };
  }

  const discountPct = clampPct(plan.courtDiscountPct);
  const fullQuota = Math.max(0, plan.includedCourtBookings);
  const quotaAvailable = Math.max(
    0,
    input.quotaRemaining ?? fullQuota,
  );

  // Index sessions by price desc so quota covers the costliest first.
  const order = sessions
    .map((s, i) => ({ i, basePrice: Math.max(0, s.basePrice) }))
    .sort((a, b) => b.basePrice - a.basePrice);

  const coveredIndex = new Set<number>();
  for (let k = 0; k < Math.min(quotaAvailable, order.length); k++) {
    coveredIndex.add(order[k].i);
  }

  let quotaSavings = 0;
  let discountSavings = 0;

  const resultSessions: BenefitSessionResult[] = sessions.map((s, i) => {
    const base = Math.max(0, s.basePrice);
    if (coveredIndex.has(i)) {
      quotaSavings += base;
      return {
        label: s.label,
        basePrice: base,
        coveredByQuota: true,
        discountPct: 0,
        saved: base,
        payable: 0,
      };
    }
    const saved = Math.round((base * discountPct) / 100);
    discountSavings += saved;
    return {
      label: s.label,
      basePrice: base,
      coveredByQuota: false,
      discountPct,
      saved,
      payable: base - saved,
    };
  });

  const totalSavings = quotaSavings + discountSavings;
  const payable = Math.max(0, subtotal - totalSavings);

  return {
    sessions: resultSessions,
    subtotal,
    quotaCoveredCount: coveredIndex.size,
    quotaSavings,
    discountSavings,
    totalSavings,
    payable,
    joinFee,
    grandTotal: payable + joinFee,
    quotaRemainingAfter: Math.max(0, quotaAvailable - coveredIndex.size),
  };
}

/** Convenience: price a single session under a plan (no quota tracking). */
export function calcSessionPrice(
  basePrice: number,
  plan?: BenefitPlan | null,
  opts?: { quotaRemaining?: number },
): BenefitSessionResult {
  const res = calcMembershipBenefit({
    plan,
    quotaRemaining: opts?.quotaRemaining,
    sessions: [{ basePrice }],
  });
  return res.sessions[0];
}
