import assert from "node:assert/strict";
import test from "node:test";
import { calculateCourtBasePrice } from "./court-price";

const schedule = Array.from({ length: 7 }, (_, day) => ({
  day,
  available: true,
  slots: Array.from({ length: 48 }, (_, slot) =>
    slot >= 34 && slot < 38 ? "peak" : "regular",
  ),
}));

test("court price is recomputed from every half-hour rate", () => {
  assert.equal(
    calculateCourtBasePrice(
      { schedule, priceOffPeak: 100_000, pricePeak: 200_000 },
      new Date("2026-07-27T16:30:00+07:00"),
      new Date("2026-07-27T17:30:00+07:00"),
    ),
    150_000,
  );
});

test("closed court interval is rejected", () => {
  const closedSchedule = schedule.map((day) => ({
    ...day,
    slots: day.slots.map((rate, slot) => (slot === 20 ? "closed" : rate)),
  }));
  assert.throws(
    () =>
      calculateCourtBasePrice(
        {
          schedule: closedSchedule,
          priceOffPeak: 100_000,
          pricePeak: 200_000,
        },
        new Date("2026-07-27T10:00:00+07:00"),
        new Date("2026-07-27T11:00:00+07:00"),
      ),
    /closed/,
  );
});
