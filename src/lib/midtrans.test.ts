import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  buildMidtransOrderId,
  isMidtransPaymentSettled,
  midtransOrderBelongsToCompany,
  verifyMidtransNotificationSignature,
} from "./midtrans";

test("Midtrans order id is short enough and bound to its tenant", () => {
  const orderId = buildMidtransOrderId("smashcourt-jakarta");

  assert.match(orderId, /^MID-/);
  assert.ok(orderId.length <= 50);
  assert.equal(
    midtransOrderBelongsToCompany(orderId, "smashcourt-jakarta"),
    true,
  );
  assert.equal(midtransOrderBelongsToCompany(orderId, "other-club"), false);
});

test("Midtrans notification signature is verified with SHA-512", () => {
  const payload = {
    order_id: "MID-order",
    status_code: "200",
    gross_amount: "125000.00",
    signature_key: createHash("sha512")
      .update("MID-order200125000.00server-secret")
      .digest("hex"),
  };

  assert.equal(
    verifyMidtransNotificationSignature(payload, "server-secret"),
    true,
  );
  assert.equal(
    verifyMidtransNotificationSignature(
      { ...payload, gross_amount: "1.00" },
      "server-secret",
    ),
    false,
  );
});

test("only settled or non-challenged capture is accepted as paid", () => {
  assert.equal(
    isMidtransPaymentSettled({ transaction_status: "settlement" }),
    true,
  );
  assert.equal(
    isMidtransPaymentSettled({
      transaction_status: "capture",
      fraud_status: "accept",
    }),
    true,
  );
  assert.equal(
    isMidtransPaymentSettled({
      transaction_status: "capture",
      fraud_status: "challenge",
    }),
    false,
  );
  assert.equal(
    isMidtransPaymentSettled({ transaction_status: "pending" }),
    false,
  );
});
