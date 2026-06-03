// PadelHub — member-registration wizard shared types + tier economics.
// Consumed by MemberRegister.tsx and its register/* sub-steps. No DB: every
// id / availability is derived deterministically from inputs (SSR-safe).

import type { MemberTier } from "@/data/padel/club/members";

/** Joining / first-payment fee per tier (IDR). Daily walk-in is free. */
export const tierJoinFee: Record<MemberTier, number> = {
  daily: 0,
  casual: 150_000,
  pro: 450_000,
  elite: 850_000,
};

/** Court bookings included in the membership before pay-as-you-play kicks in. */
export const tierQuota: Record<MemberTier, number> = {
  daily: 1, // single walk-in session, today only
  casual: 0, // pay-as-you-play
  pro: 4,
  elite: 8,
};

/** Elite waives the PT coach fee (court fee still applies when included). */
export const tierWaivesCoachFee = (tier: MemberTier): boolean => tier === "elite";

/** A court booking the user assembled in step 3 (pre-persist). */
export interface DraftBooking {
  id: string; // local draft id
  courtId: string;
  dateKey: string; // YYYY-MM-DD
  hour: number; // start hour
  duration: number; // minutes
  /** raw court fee for this slot (peak-aware) */
  price: number;
}

/** Court arrangement mode for a PT session. */
export type PtCourtMode = "existing" | "include" | "exclude";

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
