import assert from "node:assert/strict";
import test from "node:test";
import {
  refundStatusForMethod,
  validatePaymentInput,
  type PaymentInput,
} from "./payment-rules";

test("cash payment rejects insufficient tender", () => {
  const input: PaymentInput = {
    actor: "staff",
    method: "Cash",
    total: 150_000,
    cashReceived: 100_000,
  };
  assert.deepEqual(validatePaymentInput(input), {
    ok: false,
    error: "Uang tunai kurang dari total.",
  });
});

test("cash refund settles immediately while provider refund stays pending", () => {
  assert.equal(refundStatusForMethod("Cash"), "refunded");
  assert.equal(refundStatusForMethod("QRIS"), "pending");
  assert.equal(refundStatusForMethod("Transfer"), "pending");
});

test("cash payment returns server-calculated change", () => {
  assert.deepEqual(
    validatePaymentInput({
      actor: "staff",
      method: "Cash",
      total: 150_000,
      cashReceived: 200_000,
    }),
    { ok: true, change: 50_000 },
  );
});

test("member cannot mark a non-cash payment as settled without provider proof", () => {
  assert.deepEqual(
    validatePaymentInput({
      actor: "member",
      method: "QRIS",
      total: 150_000,
    }),
    {
      ok: false,
      error: "Pembayaran non-tunai belum dikonfirmasi oleh provider.",
    },
  );
});

test("provider-confirmed member payment is accepted", () => {
  assert.deepEqual(
    validatePaymentInput({
      actor: "member",
      method: "QRIS",
      total: 150_000,
      providerConfirmationId: "gateway-123",
    }),
    { ok: true, change: 0 },
  );
});

test("zero-value member checkout does not require a provider transaction", () => {
  assert.deepEqual(
    validatePaymentInput({
      actor: "member",
      method: "QRIS",
      total: 0,
    }),
    { ok: true, change: 0 },
  );
});
