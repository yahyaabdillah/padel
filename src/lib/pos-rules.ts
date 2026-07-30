export const POS_TAX_RATE = 0.11;

export function calculatePosTotals(subtotal: number, requestedDiscount = 0) {
  if (!Number.isSafeInteger(subtotal) || subtotal < 0) {
    throw new Error("Subtotal POS tidak valid.");
  }
  const discount = Math.max(
    0,
    Math.min(
      subtotal,
      Number.isSafeInteger(requestedDiscount) ? requestedDiscount : 0,
    ),
  );
  const tax = Math.round((subtotal - discount) * POS_TAX_RATE);
  return {
    subtotal,
    discount,
    tax,
    total: subtotal - discount + tax,
  };
}

export function validatePosQuantity(stock: number, quantity: number): number {
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 999) {
    throw new Error("Jumlah produk tidak valid.");
  }
  if (stock !== -1 && quantity > stock) {
    throw new Error("Stok produk tidak mencukupi.");
  }
  return quantity;
}
