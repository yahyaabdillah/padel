// Legacy display metadata for membership benefits. The operational source of
// truth is m_membership_plan in the tenant database.
//
// Quota model: a plan can bundle `includedCourtBookings` free court bookings per
// cycle. The cycle resets every `resetPeriodDays` days. While quota remains, a
// member's court booking is free (Rp0) for ANY court/hour (peak included).
// Beyond quota, the member pays the normal rate (optionally minus
// `courtDiscountPct`). Daily/walk-in & casual have zero quota.

import type { MemberTier } from "./members";

export interface MembershipPlan {
  /** plan id — aligned with the club MemberTier so a member's tier maps 1:1 */
  id: MemberTier;
  name: string;
  /** accent color for cards/badges */
  color: string;
  /** recurring membership fee in IDR (0 = free) */
  priceMonthly: number;
  /** join / first-payment fee in IDR (0 = none) */
  joinFee: number;
  /** number of court bookings included free per cycle */
  includedCourtBookings: number;
  /** how many days before the quota cycle resets (e.g. 30) */
  resetPeriodDays: number;
  /** free coaching sessions bundled per cycle (coach fee waived) */
  freeCoaching: number;
  /** discount on court bookings made AFTER the quota is used up (%) */
  courtDiscountPct: number;
  /** marketing bullet points */
  perks: string[];
  /** whether the plan is offered/selectable */
  active: boolean;
  /** highlight as "most popular" */
  highlighted?: boolean;
}

export const seedMembershipPlans: MembershipPlan[] = [
  {
    id: "daily",
    name: "Daily Walk-in",
    color: "#F59E0B",
    priceMonthly: 0,
    joinFee: 0,
    includedCourtBookings: 0,
    resetPeriodDays: 0,
    freeCoaching: 0,
    courtDiscountPct: 0,
    active: true,
    perks: ["Booking sekali main", "Bayar tarif normal", "Tanpa keanggotaan"],
  },
  {
    id: "casual",
    name: "Casual",
    color: "#94A3B8",
    priceMonthly: 0,
    joinFee: 150_000,
    includedCourtBookings: 0,
    resetPeriodDays: 30,
    freeCoaching: 0,
    courtDiscountPct: 0,
    active: true,
    perks: ["Member dasar", "Bayar per booking", "Riwayat & ranking match"],
  },
  {
    id: "pro",
    name: "Pro",
    color: "#6D5BFF",
    priceMonthly: 450_000,
    joinFee: 450_000,
    includedCourtBookings: 4,
    resetPeriodDays: 30,
    freeCoaching: 2,
    courtDiscountPct: 15,
    active: true,
    highlighted: true,
    perks: [
      "4x booking lapangan gratis / siklus",
      "2x coaching gratis / siklus",
      "15% off booking setelah kuota habis",
      "Priority booking window (+24 jam)",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    color: "#14B8A6",
    priceMonthly: 850_000,
    joinFee: 850_000,
    includedCourtBookings: 8,
    resetPeriodDays: 30,
    freeCoaching: 8,
    courtDiscountPct: 30,
    active: true,
    perks: [
      "8x booking lapangan gratis / siklus",
      "8x coaching gratis / siklus",
      "30% off booking setelah kuota habis",
      "Priority booking window (+48 jam)",
      "Locker pribadi",
    ],
  },
];

export const planById = (
  plans: MembershipPlan[],
  id: string,
): MembershipPlan | undefined => plans.find((p) => p.id === id);
