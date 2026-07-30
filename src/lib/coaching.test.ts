import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  coachingQuotaForSchedule,
  validateCoachingCycle,
} from "./coaching";

test("coaching cycle validation rejects malformed slots", () => {
  assert.equal(validateCoachingCycle({ durationMin: 60, slots: [] }).ok, false);
  assert.equal(
    validateCoachingCycle({
      durationMin: 60,
      slots: [{ day: 1, time: "9:00" }],
    }).ok,
    false,
  );
  assert.equal(
    validateCoachingCycle({
      durationMin: 60,
      slots: [
        { day: 1, time: "09:00" },
        { day: 1, time: "10:00" },
      ],
    }).ok,
    false,
  );
});

test("free coaching quota is capped by remaining benefit and package sessions", () => {
  assert.deepEqual(
    coachingQuotaForSchedule({
      freeCoaching: 3,
      coachingUsed: 1,
      sessionCount: 4,
    }),
    { consumed: 2, paid: 2 },
  );
  assert.deepEqual(
    coachingQuotaForSchedule({
      freeCoaching: 2,
      coachingUsed: 5,
      sessionCount: 4,
    }),
    { consumed: 0, paid: 4 },
  );
});

test("coaching persistence records and restores free-quota usage transactionally", () => {
  const source = readFileSync("src/app/(admin)/coaching/actions.ts", "utf8");
  assert.match(source, /coachingQuotaConsumed: quotaUse\.consumed/);
  assert.match(source, /coachingUsed: quota\.shouldStartNewCycle/);
  assert.match(source, /isolationLevel: "Serializable"/);
  assert.match(source, /coachingQuotaConsumed > 0/);
  assert.match(source, /Math\.max\(0, member\.coachingUsed - schedule\.coachingQuotaConsumed\)/);
});

test("server schedule creation rejects inactive packages and mismatched slots", () => {
  const source = readFileSync("src/app/(admin)/coaching/actions.ts", "utf8");
  assert.match(source, /active: true, \.\.\.NOT_DELETED/);
  assert.match(source, /SESSION_COUNT_MISMATCH/);
  assert.match(source, /SLOT_MISMATCH/);
  assert.match(source, /COACH_UNAVAILABLE/);
});
