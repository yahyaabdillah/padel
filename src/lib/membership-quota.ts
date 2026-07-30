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

/** Membership benefits remain active only inside the paid join period. */
export function isMembershipCycleActive(input: {
  cycleStart: Date | string | null;
  resetPeriodDays: number;
  now?: Date;
}): boolean {
  if (!input.cycleStart) return false;
  if (input.resetPeriodDays <= 0) return true;
  const started = new Date(input.cycleStart);
  const now = input.now ?? new Date();
  if (Number.isNaN(started.getTime())) return false;
  return (
    now.getTime() - started.getTime() <
    input.resetPeriodDays * 86_400_000
  );
}

export function quotaUnitsForDuration(durationMinutes: number): number {
  if (durationMinutes !== 60) {
    throw new Error("Membership quota sessions must be exactly 60 minutes.");
  }
  return 1;
}

export function canRestoreQuotaForCancellation(input: {
  wasQuotaCovered: boolean;
  bookingCreatedAt: Date;
  currentCycleStart: Date | null;
}): boolean {
  if (!input.wasQuotaCovered || !input.currentCycleStart) return false;
  return input.bookingCreatedAt >= input.currentCycleStart;
}
