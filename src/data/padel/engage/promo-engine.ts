// PadelHub — Promo engine (dummy, no DB).
// SEPARATE from the display-only `marketing.ts` `Promo` type. This `EnginePromo`
// model drives the real apply/validate flow used across every transaction
// surface (membership, booking, PT, class, POS) via PromoContext.applyPromo().
// Codes intentionally overlap with the marketing seed (WEEKDAY30, etc.) so the
// marketing table + the live engine tell the same story.

import type { MemberTier } from "@/data/padel/club/members";

/** Where a promo is allowed to be redeemed. */
export type PromoScope = "membership" | "booking" | "pt" | "class" | "pos";

/** Discount kind. */
export type PromoKind = "percent" | "flat";

/** Either everyone, or a restricted set of member tiers. */
export type PromoAudience = "all" | MemberTier[];

export interface EnginePromo {
  id: string;
  code: string;
  name: string;
  type: PromoKind;
  /** percent = 0..100, flat = IDR amount */
  value: number;
  appliesTo: PromoScope[];
  audience: PromoAudience;
  notify: boolean;
  active: boolean;
  /** ISO yyyy-mm-dd */
  validFrom: string;
  /** ISO yyyy-mm-dd */
  validTo: string;
  minSpend?: number;
  maxDiscount?: number;
}

/** Result of attempting to apply a promo to a transaction amount. */
export interface ApplyResult {
  ok: boolean;
  /** absolute discount in IDR (0 when not ok) */
  discount: number;
  /** amount after discount (== original amount when not ok) */
  finalAmount: number;
  /** human-readable failure/success note */
  reason?: string;
  /** echoes the applied code on success */
  code?: string;
}

/** UI labels for each scope (Bahasa Indonesia, club-facing). */
export const promoScopeLabels: Record<PromoScope, string> = {
  membership: "Membership",
  booking: "Booking Lapangan",
  pt: "Personal Training",
  class: "Kelas / Clinic",
  pos: "Pro-Shop (POS)",
};

/** All scopes, handy for builder UIs. */
export const allPromoScopes: PromoScope[] = [
  "membership",
  "booking",
  "pt",
  "class",
  "pos",
];

/** ~6 dummy promos; codes map to the existing marketing seed where sensible. */
export const seedEnginePromos: EnginePromo[] = [
  {
    id: "eng-weekday30",
    code: "WEEKDAY30",
    name: "Off-Peak Weekday 30%",
    type: "percent",
    value: 30,
    appliesTo: ["booking", "class"],
    audience: "all",
    notify: false,
    active: true,
    validFrom: "2026-05-01",
    validTo: "2026-06-30",
    maxDiscount: 150_000,
  },
  {
    id: "eng-welcome100",
    code: "WELCOME100",
    name: "New Member — Rp100K Off First Booking",
    type: "flat",
    value: 100_000,
    appliesTo: ["membership", "booking"],
    audience: "all",
    notify: false,
    active: true,
    validFrom: "2026-04-01",
    validTo: "2026-12-31",
    minSpend: 150_000,
  },
  {
    id: "eng-clinic20",
    code: "CLINIC20",
    name: "Coaching Clinic Launch 20%",
    type: "percent",
    value: 20,
    appliesTo: ["pt", "class"],
    audience: ["pro", "elite"],
    notify: true,
    active: true,
    validFrom: "2026-05-10",
    validTo: "2026-07-10",
  },
  {
    id: "eng-racket15",
    code: "RACKET15",
    name: "Pro-Shop Racket Clearance 15%",
    type: "percent",
    value: 15,
    appliesTo: ["pos"],
    audience: "all",
    notify: false,
    active: true,
    validFrom: "2026-05-20",
    validTo: "2026-07-05",
    maxDiscount: 200_000,
  },
  {
    id: "eng-elite50",
    code: "ELITE50K",
    name: "Elite Member Rp50K Off Anything",
    type: "flat",
    value: 50_000,
    appliesTo: ["membership", "booking", "pt", "class", "pos"],
    audience: ["elite"],
    notify: false,
    active: true,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
  },
  {
    id: "eng-nightbundle",
    code: "NIGHTBUNDLE",
    name: "Ramadan Night Bundle (expired)",
    type: "percent",
    value: 25,
    appliesTo: ["booking"],
    audience: "all",
    notify: false,
    active: false,
    validFrom: "2026-03-01",
    validTo: "2026-03-31",
  },
];
