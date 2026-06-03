"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRole } from "@/context/RoleContext";
import { memberById, type Member } from "@/data/padel/club/members";

/* ════════════════════════════════════════════════════════
 * Onboarding state (first-login player profile completion)
 *
 * Tracks whether the signed-in member has completed the optional
 * padel-profile onboarding stepper (/me/onboarding). Dummy, no DB —
 * the flag + collected profile are persisted to localStorage.
 *
 * Seed `onboarded` comes from club member data; once the member either
 * completes or skips the flow, a localStorage override wins.
 * ════════════════════════════════════════════════════════ */

/* Demo identity bridge: RoleContext.currentUser.id is "member-001"
 * (capitalized "Pro" tier), but club seed data keys members as "mbr-00X".
 * Map the demo member-portal user to the seeded roster member so the
 * `onboarded` lookup resolves. Identical mapping is mirrored in the
 * check-in builder (kept local — no shared file allowed). */
const DEMO_MEMBER_MAP: Record<string, string> = {
  "member-001": "mbr-001", // Andi Wijaya (portal demo) → seeded roster
};

/** Resolve the current portal user to a seeded club member id. */
export const resolveSeedMemberId = (userId: string): string =>
  DEMO_MEMBER_MAP[userId] ?? userId;

/** Profile captured by the onboarding stepper (all optional). */
export interface OnboardingProfile {
  gender?: "L" | "P";
  birthDate?: string | null; // ISO date
  city?: string;
  avatar?: string; // data URL / preview (dummy)
  skillLevel?: "beginner" | "intermediate" | "advanced";
  dominantHand?: "left" | "right";
  position?: "left" | "right" | "both";
  rating?: number;
  playFrequency?: "1-2" | "3-4" | "5+";
  emergencyName?: string;
  emergencyPhone?: string;
}

type OnboardingState = {
  /** whether this member has finished or skipped onboarding */
  onboarded: boolean;
  /** explicitly completed (vs. skipped) */
  completed: boolean;
  profile: OnboardingProfile;
};

type OnboardingContextType = {
  /** the resolved seed member, if the current user is a member */
  member?: Member;
  /** true once finished OR skipped */
  isOnboarded: boolean;
  /** member && not yet onboarded — drives the first-login prompt */
  needsOnboarding: boolean;
  /** stored optional profile (empty until completed) */
  profile: OnboardingProfile;
  /** finish onboarding with the collected profile */
  complete: (profile: OnboardingProfile) => void;
  /** dismiss onboarding without filling the profile */
  skip: () => void;
  /** clear the local override (re-show prompt) — demo/testing helper */
  reset: () => void;
  /** false until localStorage has hydrated (avoids SSR flash) */
  isReady: boolean;
};

const STORAGE_KEY = "padelhub-onboarding";

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx)
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  return ctx;
};

type Store = Record<string, OnboardingState>;

const readStore = (): Store => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, isMember } = useRole();
  const [store, setStore] = useState<Store>({});
  const [isReady, setIsReady] = useState(false);

  // Hydrate after mount (SSR-safe).
  useEffect(() => {
    setStore(readStore());
    setIsReady(true);
  }, []);

  const seedId = resolveSeedMemberId(currentUser.id);
  const member = useMemo(
    () => (isMember ? memberById(seedId) : undefined),
    [isMember, seedId],
  );

  // Local override (set after complete/skip) takes precedence over seed.
  const override = store[seedId];
  const seedOnboarded = member?.onboarded ?? false;
  const onboarded = override ? override.onboarded : seedOnboarded;
  const profile = override?.profile ?? {};

  const persist = useCallback((next: Store) => {
    setStore(next);
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const complete = useCallback(
    (next: OnboardingProfile) => {
      persist({
        ...readStore(),
        [seedId]: { onboarded: true, completed: true, profile: next },
      });
    },
    [persist, seedId],
  );

  const skip = useCallback(() => {
    persist({
      ...readStore(),
      [seedId]: { onboarded: true, completed: false, profile: {} },
    });
  }, [persist, seedId]);

  const reset = useCallback(() => {
    const next = { ...readStore() };
    delete next[seedId];
    persist(next);
  }, [persist, seedId]);

  const value = useMemo<OnboardingContextType>(
    () => ({
      member,
      isOnboarded: onboarded,
      needsOnboarding: isReady && isMember && !!member && !onboarded,
      profile,
      complete,
      skip,
      reset,
      isReady,
    }),
    [member, onboarded, isReady, isMember, profile, complete, skip, reset],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
