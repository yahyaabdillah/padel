// PadelHub — member-registration wizard shared types + tier economics.
// Consumed by MemberRegister.tsx and its register/* sub-steps. No DB: every
// id / availability is derived deterministically from inputs (SSR-safe).

import type { MemberTier } from "@/data/padel/club/members";

/** Joining / first-payment fee per tier (IDR). Daily walk-in is free. */
export const tierJoinFee: Record<MemberTier, number> = {
  daily: 0,
  casual: 150_000, // legacy (seed members only) — not offered at registration
  pro: 450_000,
  elite: 850_000,
};

/** Court bookings included in the membership before pay-as-you-play kicks in. */
export const tierQuota: Record<MemberTier, number> = {
  daily: 0, // walk-in: booking biasa, tetap bayar
  casual: 0, // legacy
  pro: 4,
  elite: 8,
};

/**
 * Free coaching sessions bundled with the tier (coach fee waived for the first
 * N PT sessions). Court fee — when a new court is reserved for the session —
 * still applies. Daily/casual get none and pay full coach fee per session.
 */
export const tierFreeCoaching: Record<MemberTier, number> = {
  daily: 0,
  casual: 0,
  pro: 2,
  elite: 8,
};

/** Tiers offered in the registration form (casual is legacy, not selectable). */
export const registrableTiers: MemberTier[] = ["daily", "pro", "elite"];

/** A court booking the user assembled in step 3 (pre-persist). */
export interface DraftBooking {
  id: string; // local draft id
  courtId: string;
  dateKey: string; // YYYY-MM-DD
  hour: number; // start hour
  /** start minute within the hour (0 or 30) — supports 30-min slots */
  minute?: number;
  duration: number; // minutes
  /** raw court fee for this slot (peak-aware) */
  price: number;
}

/** Court arrangement mode for a PT session. */
export type PtCourtMode = "existing" | "include" | "exclude";

/** Coaching pricing model chosen at registration. */
export type CoachingMode = "package" | "casual";

/** A single PT session the user assembled in step 4 (pre-persist). */
export interface DraftPtSession {
  id: string; // local draft id
  dateKey: string;
  coachId: string;
  time: string; // "HH:MM"
  courtMode: PtCourtMode;
  /** true when courtMode is "include" (book new court) — kept for backwards compat */
  includeCourt: boolean;
  courtId: string | null; // chosen court when include; existing court id when "existing"
  /** ID of the DraftBooking being reused (courtMode "existing") */
  existingDraftId?: string;
}

export const pad = (n: number): string => String(n).padStart(2, "0");

export const idr = (n: number): string => `Rp${n.toLocaleString("id-ID")}`;

/** Local "today" for the demo (matches the seeded booking generator). */
export const TODAY_KEY = "2026-06-02";
