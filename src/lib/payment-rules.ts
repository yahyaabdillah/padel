import type { ActorKind, PayMethod } from "./checkout-core";

export interface PaymentInput {
  actor: ActorKind;
  method: PayMethod;
  total: number;
  cashReceived?: number;
  providerConfirmationId?: string;
}

export type PaymentValidation =
  | { ok: true; change: number }
  | { ok: false; error: string };

export function refundStatusForMethod(
  method: PayMethod,
): "pending" | "refunded" {
  return method === "Cash" ? "refunded" : "pending";
}

export function validatePaymentInput(
  input: PaymentInput,
): PaymentValidation {
  if (!Number.isSafeInteger(input.total) || input.total < 0) {
    return { ok: false, error: "Total pembayaran tidak valid." };
  }
  if (input.total === 0) return { ok: true, change: 0 };

  if (input.method === "Cash") {
    if (input.actor !== "staff") {
      return {
        ok: false,
        error: "Pembayaran tunai hanya tersedia di front desk.",
      };
    }
    const received = input.cashReceived ?? 0;
    if (!Number.isSafeInteger(received) || received < input.total) {
      return { ok: false, error: "Uang tunai kurang dari total." };
    }
    return { ok: true, change: received - input.total };
  }

  if (input.actor === "member" && !input.providerConfirmationId?.trim()) {
    return {
      ok: false,
      error: "Pembayaran non-tunai belum dikonfirmasi oleh provider.",
    };
  }

  return { ok: true, change: 0 };
}
