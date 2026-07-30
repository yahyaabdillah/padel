import assert from "node:assert/strict";
import test from "node:test";
import { decryptPaymentSecret, encryptPaymentSecret } from "./payment-config-crypto";

const KEY = "test-payment-config-key-that-is-long-enough";

test("payment credentials are encrypted and can be decrypted", () => {
  const encrypted = encryptPaymentSecret("SB-Mid-server-secret", KEY);

  assert.notEqual(encrypted, "SB-Mid-server-secret");
  assert.equal(decryptPaymentSecret(encrypted, KEY), "SB-Mid-server-secret");
});

test("payment credentials cannot be decrypted with another key", () => {
  const encrypted = encryptPaymentSecret("SB-Mid-server-secret", KEY);

  assert.throws(() =>
    decryptPaymentSecret(encrypted, "a-different-payment-config-key-value"),
  );
});
