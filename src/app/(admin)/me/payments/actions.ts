"use server";

import { readSession } from "@/lib/access-guard";
import { getTenantDb } from "@/lib/tenant-db";
import type {
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
} from "@/data/padel/member/payments";
import { paymentHistoryCategory } from "@/lib/payment-history";

const paymentMethod = (method: string): PaymentMethod =>
  method === "Cash" || method === "QRIS" || method === "Transfer"
    ? method
    : "Bank Transfer";

const paymentStatus = (status: string): PaymentStatus =>
  status === "paid" ||
  status === "pending" ||
  status === "refunded" ||
  status === "failed"
    ? status
    : status === "partially_refunded"
      ? "refunded"
      : "pending";

export async function getMyPaymentsAction(): Promise<PaymentRecord[]> {
  const session = await readSession();
  if (!session || session.role !== "member") return [];
  const db = await getTenantDb(session.dbConfig);
  const payments = await db.t_payment.findMany({
    where: {
      companyId: session.companyId,
      isDeleted: 0,
      OR: [
        { memberId: session.id },
        { bookings: { some: { memberId: session.id } } },
        { histories: { some: { memberId: session.id } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      bookings: {
        where: { memberId: session.id },
        include: {
          details: {
            where: { isDeleted: 0 },
            include: { court: { select: { name: true } } },
          },
        },
      },
      histories: {
        where: { memberId: session.id },
        select: { planName: true, joinFee: true },
      },
      refunds: {
        where: { isDeleted: 0, status: "refunded" },
        select: { amount: true },
      },
      posSale: {
        include: {
          items: {
            where: { isDeleted: 0 },
            select: { name: true, quantity: true, unitPrice: true },
          },
        },
      },
    },
    take: 200,
  });

  return payments.map((payment) => {
    const bookingItems = payment.bookings.flatMap((booking) =>
      booking.details.map((detail) => ({
        label: `${detail.court.name} · ${detail.start.toISOString()}`,
        qty: 1,
        price: detail.price,
      })),
    );
    const membershipItems = payment.histories.map((history) => ({
      label: `Membership ${history.planName}`,
      qty: 1,
      price: history.joinFee,
    }));
    const posItems = payment.posSale?.items.map((item) => ({
      label: item.name,
      qty: item.quantity,
      price: item.unitPrice,
    })) ?? [];
    const category = paymentHistoryCategory(payment);
    const refundedAmount = payment.refunds.reduce((sum, refund) => sum + refund.amount, 0);
    return {
      id: payment.id,
      invoiceNo: payment.paymentRef,
      description:
        category === "Pro Shop"
          ? payment.posSale?.receiptNo ?? "Pro Shop"
          : category === "Membership"
            ? "Membership"
            : category === "Booking & Membership"
              ? "Court booking & membership"
              : "Court booking",
      category,
      date: payment.createdAt.toISOString(),
      amount: payment.amount,
      method: paymentMethod(payment.method),
      status: refundedAmount >= payment.amount && payment.amount > 0
        ? "refunded"
        : paymentStatus(payment.status),
      refundedAmount,
      items: [...membershipItems, ...bookingItems, ...posItems],
    };
  });
}
