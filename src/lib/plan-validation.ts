export interface PlanNumbers {
  joinFee: number;
  includedCourtBookings: number;
  resetPeriodDays: number;
  freeCoaching: number;
  courtDiscountPct: number;
  sortOrder: number;
}

export type PlanValidation =
  | { ok: true }
  | { ok: false; error: string };

export function validatePlanNumbers(input: PlanNumbers): PlanValidation {
  const integers = Object.values(input);
  if (integers.some((value) => !Number.isSafeInteger(value))) {
    return { ok: false, error: "Nilai plan harus berupa bilangan bulat." };
  }
  if (
    input.joinFee < 0 ||
    input.includedCourtBookings < 0 ||
    input.resetPeriodDays < 0 ||
    input.freeCoaching < 0 ||
    input.sortOrder < 0
  ) {
    return { ok: false, error: "Nilai plan tidak boleh negatif." };
  }
  if (input.courtDiscountPct < 0 || input.courtDiscountPct > 100) {
    return { ok: false, error: "Diskon harus berada di antara 0 dan 100%." };
  }
  return { ok: true };
}
