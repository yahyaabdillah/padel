"use server";

import { requirePermission } from "@/lib/access-guard";
import { getTenantDb } from "@/lib/tenant-db";
import type {
  Transaction,
  TxnCategory,
  TxnMethod,
  TxnStatus,
} from "@/data/padel/club/finance";

const method = (value: string): TxnMethod => {
  const normalized = value.toLowerCase();
  return ["cash", "card", "qris", "wallet", "transfer"].includes(normalized)
    ? (normalized as TxnMethod)
    : "transfer";
};

const status = (value: string): TxnStatus => {
  if (value === "partially_refunded") return "refunded";
  return ["paid", "pending", "refunded", "failed"].includes(value)
    ? (value as TxnStatus)
    : "pending";
};

export async function getFinanceTransactionsAction(): Promise<Transaction[]> {
  const guard = await requirePermission("finance.view", "view");
  if (!guard.ok) return [];
  const { session } = guard;
  const db = await getTenantDb(session.dbConfig);
  const [payments, refunds] = await Promise.all([
    db.t_payment.findMany({
      where: { companyId: session.companyId, isDeleted: 0 },
      include: {
        bookings: { select: { customer: true } },
        histories: {
          select: { member: { select: { name: true } } },
        },
        posSale: { select: { customer: true, receiptNo: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    db.t_refund.findMany({
      where: { companyId: session.companyId, isDeleted: 0 },
      include: {
        payment: true,
        bookingDetail: {
          select: { booking: { select: { customer: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const paymentRows: Transaction[] = payments.map((payment) => {
    const category: TxnCategory = payment.posAmount > 0
      ? "pos"
      : payment.membershipAmount > 0 && payment.courtAmount === 0
        ? "membership"
        : "court_booking";
    const customer =
      payment.bookings[0]?.customer ??
      payment.histories[0]?.member.name ??
      payment.posSale?.customer ??
      "Customer";
    return {
      id: payment.id,
      ref: payment.paymentRef,
      date: payment.createdAt.toISOString(),
      category,
      description:
        category === "pos"
          ? `POS ${payment.posSale?.receiptNo ?? ""}`.trim()
          : payment.membershipAmount > 0 && payment.courtAmount > 0
          ? "Membership + court booking"
          : category === "membership"
            ? "Membership"
            : "Court booking",
      customer,
      method: method(payment.method),
      status: status(payment.status),
      amount: payment.amount,
    };
  });
  const refundRows: Transaction[] = refunds.map((refund) => ({
    id: refund.id,
    ref: `REF-${refund.id.slice(0, 8).toUpperCase()}`,
    date: refund.createdAt.toISOString(),
    category: "refund",
    description: refund.reason ?? "Booking refund",
    customer: refund.bookingDetail.booking.customer,
    method: method(refund.payment.method),
    status: status(refund.status),
    amount: -refund.amount,
  }));
  return [...paymentRows, ...refundRows].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}
