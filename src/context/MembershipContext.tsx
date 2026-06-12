"use client";

// PadelHub — membership store (plans + per-member quota tracking). Dummy, no DB.
// Persisted to localStorage. Plans are editable via Master ▸ Membership Plan.
// Quota: each active membership bundles `includedCourtBookings` free court
// bookings per cycle of `resetPeriodDays` days. consumeCourtQuota() is called
// when a free booking is made; getMembershipStatus() reports remaining quota
// and the next reset date, auto-rolling the cycle when it has elapsed.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  seedMembershipPlans,
  planById,
  type MembershipPlan,
} from "@/data/padel/club/membershipPlans";
import { mockMembers, type MemberTier } from "@/data/padel/club/members";

const LS_PLANS = "padelhub.club.membershipPlans.v1";
const LS_MEMBERSHIPS = "padelhub.club.memberships.v1";

/** Per-member membership state (quota usage within the current cycle). */
export interface MemberMembership {
  memberId: string;
  planId: MemberTier;
  /** ISO date the current quota cycle started */
  cycleStart: string;
  /** included court bookings consumed in the current cycle */
  courtQuotaUsed: number;
  /** free coaching sessions consumed in the current cycle */
  coachingUsed: number;
}

/** Computed, display-ready membership status for a member. */
export interface MembershipStatus {
  member: (typeof mockMembers)[number];
  plan: MembershipPlan | undefined;
  hasActivePlan: boolean;
  quotaTotal: number;
  quotaUsed: number;
  quotaRemaining: number;
  coachingTotal: number;
  coachingUsed: number;
  coachingRemaining: number;
  /** ISO date when the quota cycle next resets (null if plan has no reset) */
  resetAt: string | null;
  courtDiscountPct: number;
}

interface MembershipValue {
  plans: MembershipPlan[];
  memberships: MemberMembership[];
  isReady: boolean;
  // plan CRUD
  addPlan: (plan: Omit<MembershipPlan, "id"> & { id?: MemberTier }) => void;
  updatePlan: (id: string, patch: Partial<MembershipPlan>) => void;
  deletePlan: (id: string) => void;
  resetPlans: () => void;
  // membership / quota
  getMembershipStatus: (memberId: string) => MembershipStatus | null;
  consumeCourtQuota: (memberId: string, count?: number) => void;
}

const MembershipContext = createContext<MembershipValue | null>(null);

const todayKey = "2026-06-02"; // demo "today" (matches booking generator)

const addDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const daysBetween = (fromIso: string, toIso: string): number => {
  const a = new Date(`${fromIso}T00:00:00`).getTime();
  const b = new Date(`${toIso}T00:00:00`).getTime();
  return Math.floor((b - a) / 86_400_000);
};

// Seed per-member memberships from each member's tier, with a little demo
// usage so the quota indicators aren't all empty.
function seedMemberships(): MemberMembership[] {
  return mockMembers
    .filter((m) => m.tier !== "daily")
    .map((m, i) => ({
      memberId: m.id,
      planId: m.tier,
      cycleStart: todayKey,
      // deterministic demo usage
      courtQuotaUsed: m.tier === "pro" ? (i % 3) % 5 : m.tier === "elite" ? (i % 5) : 0,
      coachingUsed: m.tier === "elite" ? (i % 3) : 0,
    }));
}

export const MembershipProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [plans, setPlans] = useState<MembershipPlan[]>(seedMembershipPlans);
  const [memberships, setMemberships] = useState<MemberMembership[]>(
    seedMemberships,
  );
  const [isReady, setIsReady] = useState(false);

  // hydrate
  useEffect(() => {
    try {
      const p = localStorage.getItem(LS_PLANS);
      if (p) {
        const parsed = JSON.parse(p) as MembershipPlan[];
        if (Array.isArray(parsed) && parsed.length) setPlans(parsed);
      }
      const m = localStorage.getItem(LS_MEMBERSHIPS);
      if (m) {
        const parsed = JSON.parse(m) as MemberMembership[];
        if (Array.isArray(parsed)) setMemberships(parsed);
      }
    } catch {
      /* ignore */
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      localStorage.setItem(LS_PLANS, JSON.stringify(plans));
    } catch {
      /* ignore */
    }
  }, [plans, isReady]);

  useEffect(() => {
    if (!isReady) return;
    try {
      localStorage.setItem(LS_MEMBERSHIPS, JSON.stringify(memberships));
    } catch {
      /* ignore */
    }
  }, [memberships, isReady]);

  const addPlan = useCallback<MembershipValue["addPlan"]>((plan) => {
    const id = (plan.id ?? (`plan-${Date.now().toString(36)}` as MemberTier)) as MemberTier;
    setPlans((prev) => [...prev, { ...plan, id }]);
  }, []);

  const updatePlan = useCallback((id: string, patch: Partial<MembershipPlan>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const deletePlan = useCallback((id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const resetPlans = useCallback(() => {
    setPlans(seedMembershipPlans);
    try {
      localStorage.removeItem(LS_PLANS);
    } catch {
      /* ignore */
    }
  }, []);

  // Resolve the membership for a member, rolling the cycle forward if elapsed.
  const resolveMembership = useCallback(
    (memberId: string): MemberMembership | null => {
      const m = memberships.find((x) => x.memberId === memberId);
      if (!m) return null;
      const plan = planById(plans, m.planId);
      if (!plan || plan.resetPeriodDays <= 0) return m;
      // roll cycle if elapsed
      const elapsed = daysBetween(m.cycleStart, todayKey);
      if (elapsed >= plan.resetPeriodDays) {
        const cycles = Math.floor(elapsed / plan.resetPeriodDays);
        return {
          ...m,
          cycleStart: addDays(m.cycleStart, cycles * plan.resetPeriodDays),
          courtQuotaUsed: 0,
          coachingUsed: 0,
        };
      }
      return m;
    },
    [memberships, plans],
  );

  const getMembershipStatus = useCallback(
    (memberId: string): MembershipStatus | null => {
      const member = mockMembers.find((mm) => mm.id === memberId);
      if (!member) return null;
      const m = resolveMembership(memberId);
      const plan = m ? planById(plans, m.planId) : planById(plans, member.tier);
      const quotaTotal = plan?.includedCourtBookings ?? 0;
      const quotaUsed = m?.courtQuotaUsed ?? 0;
      const coachingTotal = plan?.freeCoaching ?? 0;
      const coachingUsed = m?.coachingUsed ?? 0;
      const resetAt =
        m && plan && plan.resetPeriodDays > 0
          ? addDays(m.cycleStart, plan.resetPeriodDays)
          : null;
      return {
        member,
        plan,
        hasActivePlan: !!plan && plan.id !== "daily",
        quotaTotal,
        quotaUsed,
        quotaRemaining: Math.max(quotaTotal - quotaUsed, 0),
        coachingTotal,
        coachingUsed,
        coachingRemaining: Math.max(coachingTotal - coachingUsed, 0),
        resetAt,
        courtDiscountPct: plan?.courtDiscountPct ?? 0,
      };
    },
    [resolveMembership, plans],
  );

  const consumeCourtQuota = useCallback(
    (memberId: string, count = 1) => {
      setMemberships((prev) => {
        const idx = prev.findIndex((x) => x.memberId === memberId);
        if (idx === -1) return prev;
        const plan = planById(plans, prev[idx].planId);
        // roll cycle first if needed
        let base = prev[idx];
        if (plan && plan.resetPeriodDays > 0) {
          const elapsed = daysBetween(base.cycleStart, todayKey);
          if (elapsed >= plan.resetPeriodDays) {
            const cycles = Math.floor(elapsed / plan.resetPeriodDays);
            base = {
              ...base,
              cycleStart: addDays(base.cycleStart, cycles * plan.resetPeriodDays),
              courtQuotaUsed: 0,
              coachingUsed: 0,
            };
          }
        }
        const next = [...prev];
        next[idx] = { ...base, courtQuotaUsed: base.courtQuotaUsed + count };
        return next;
      });
    },
    [plans],
  );

  const value = useMemo<MembershipValue>(
    () => ({
      plans,
      memberships,
      isReady,
      addPlan,
      updatePlan,
      deletePlan,
      resetPlans,
      getMembershipStatus,
      consumeCourtQuota,
    }),
    [
      plans,
      memberships,
      isReady,
      addPlan,
      updatePlan,
      deletePlan,
      resetPlans,
      getMembershipStatus,
      consumeCourtQuota,
    ],
  );

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
};

export function useMembership(): MembershipValue {
  const ctx = useContext(MembershipContext);
  if (!ctx) {
    throw new Error("useMembership must be used within a MembershipProvider");
  }
  return ctx;
}
