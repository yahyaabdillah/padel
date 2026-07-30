import assert from "node:assert/strict";
import test from "node:test";
import { validatePlanNumbers } from "./plan-validation";

test("membership plan accepts safe integer ranges", () => {
  assert.deepEqual(
    validatePlanNumbers({
      joinFee: 250_000,
      includedCourtBookings: 8,
      resetPeriodDays: 30,
      freeCoaching: 2,
      courtDiscountPct: 15,
      sortOrder: 1,
    }),
    { ok: true },
  );
});

test("membership plan rejects negative amounts and quota", () => {
  assert.equal(
    validatePlanNumbers({
      joinFee: -1,
      includedCourtBookings: -2,
      resetPeriodDays: 30,
      freeCoaching: 0,
      courtDiscountPct: 0,
      sortOrder: 0,
    }).ok,
    false,
  );
});

test("membership plan rejects discount above one hundred percent", () => {
  assert.equal(
    validatePlanNumbers({
      joinFee: 0,
      includedCourtBookings: 0,
      resetPeriodDays: 30,
      freeCoaching: 0,
      courtDiscountPct: 101,
      sortOrder: 0,
    }).ok,
    false,
  );
});
