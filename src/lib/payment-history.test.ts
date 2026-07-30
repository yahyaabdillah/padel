import assert from "node:assert/strict";
import test from "node:test";
import { paymentHistoryCategory } from "./payment-history";

test("payment category follows its persisted amount source", () => {
  assert.equal(paymentHistoryCategory({ membershipAmount: 100, courtAmount: 0, posAmount: 0 }), "Membership");
  assert.equal(paymentHistoryCategory({ membershipAmount: 0, courtAmount: 100, posAmount: 0 }), "Booking");
  assert.equal(paymentHistoryCategory({ membershipAmount: 0, courtAmount: 0, posAmount: 100 }), "Pro Shop");
});

test("combined membership and booking checkout is labelled clearly", () => {
  assert.equal(paymentHistoryCategory({ membershipAmount: 100, courtAmount: 100, posAmount: 0 }), "Booking & Membership");
});
