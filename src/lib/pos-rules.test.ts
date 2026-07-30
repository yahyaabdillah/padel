import assert from "node:assert/strict";
import test from "node:test";
import { calculatePosTotals, validatePosQuantity } from "./pos-rules";

test("POS totals apply discount before eleven percent tax", () => {
  assert.deepEqual(calculatePosTotals(200_000, 20_000), {
    subtotal: 200_000,
    discount: 20_000,
    tax: 19_800,
    total: 199_800,
  });
});

test("POS discount cannot exceed subtotal", () => {
  assert.equal(calculatePosTotals(50_000, 90_000).total, 0);
});

test("POS quantity rejects overselling tracked inventory", () => {
  assert.throws(() => validatePosQuantity(3, 4), /Stok/);
  assert.equal(validatePosQuantity(-1, 999), 999);
});
