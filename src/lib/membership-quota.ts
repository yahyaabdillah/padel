const DAY_MS = 86_400_000;

export interface MembershipQuotaCycleInput {
  quotaUsed: number;
  cycleStart: Date | null;
  resetPeriodDays: number;
  now?: Date;
}

export interface MembershipQuotaCycle {
  effectiveQuotaUsed: number;
  shouldStartNewCycle: boolean;
}

/**
 * Resolve the usage counter for the active membership cycle.
 * Booking transactions use this to replace an expired counter atomically.
 */
export function resolveMembershipQuotaCycle(
  input: MembershipQuotaCycleInput,
): MembershipQuotaCycle {
  const now = input.now ?? new Date();
  const quotaUsed = Math.max(0, input.quotaUsed);
  const resetPeriodDays = Math.max(0, input.resetPeriodDays);

  if (resetPeriodDays === 0) {
    return { effectiveQuotaUsed: quotaUsed, shouldStartNewCycle: false };
  }

  if (!input.cycleStart) {
    return { effectiveQuotaUsed: 0, shouldStartNewCycle: true };
  }

  const elapsedDays = Math.floor(
    (now.getTime() - input.cycleStart.getTime()) / DAY_MS,
  );
  const shouldStartNewCycle = elapsedDays >= resetPeriodDays;

  return {
    effectiveQuotaUsed: shouldStartNewCycle ? 0 : quotaUsed,
    shouldStartNewCycle,
  };
}
