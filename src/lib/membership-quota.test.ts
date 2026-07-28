import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calcMembershipBenefit } from "./membership-benefit";
import { resolveMembershipQuotaCycle } from "./membership-quota";

test("one free quota covers exactly one 60-minute court session", () => {
  const benefit = calcMembershipBenefit({
    plan: { includedCourtBookings: 2, courtDiscountPct: 0 },
    quotaRemaining: 2,
    sessions: [
      { basePrice: 100_000, label: "15:00-16:00" },
      { basePrice: 100_000, label: "16:00-17:00" },
      { basePrice: 100_000, label: "17:00-18:00" },
    ],
  });

  assert.equal(benefit.quotaCoveredCount, 2);
  assert.equal(benefit.quotaRemainingAfter, 0);
  assert.equal(benefit.sessions.filter((session) => session.coveredByQuota).length, 2);
  assert.equal(benefit.payable, 100_000);
});

test("expired membership cycle starts again from zero usage", () => {
  const cycle = resolveMembershipQuotaCycle({
    quotaUsed: 7,
    cycleStart: new Date("2026-06-01T00:00:00.000Z"),
    resetPeriodDays: 30,
    now: new Date("2026-07-27T00:00:00.000Z"),
  });

  assert.deepEqual(cycle, {
    effectiveQuotaUsed: 0,
    shouldStartNewCycle: true,
  });
});

test("active membership cycle keeps its current usage", () => {
  const cycle = resolveMembershipQuotaCycle({
    quotaUsed: 3,
    cycleStart: new Date("2026-07-20T00:00:00.000Z"),
    resetPeriodDays: 30,
    now: new Date("2026-07-27T00:00:00.000Z"),
  });

  assert.deepEqual(cycle, {
    effectiveQuotaUsed: 3,
    shouldStartNewCycle: false,
  });
});

test("booking persistence consumes quota inside the server transaction", () => {
  const adminBookingAction = readFileSync(
    "src/app/(admin)/bookings/actions.ts",
    "utf8",
  );
  const sharedCheckout = readFileSync("src/lib/checkout-core.ts", "utf8");

  for (const source of [adminBookingAction, sharedCheckout]) {
    assert.match(source, /quotaUsed:/);
    assert.match(source, /increment: benefit\.quotaCoveredCount|increment: quotaConsumed/);
    assert.match(source, /isolationLevel: "Serializable"/);
  }
});
