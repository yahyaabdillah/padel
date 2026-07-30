export type PaymentHistoryCategory =
  | "Booking"
  | "Membership"
  | "Booking & Membership"
  | "Pro Shop"
  | "Open Play"
  | "Top-up"
  | "Coaching";

export function paymentHistoryCategory(input: {
  membershipAmount: number;
  courtAmount: number;
  posAmount: number;
}): PaymentHistoryCategory {
  if (input.posAmount > 0) return "Pro Shop";
  if (input.membershipAmount > 0 && input.courtAmount > 0) return "Booking & Membership";
  if (input.membershipAmount > 0) return "Membership";
  return "Booking";
}
