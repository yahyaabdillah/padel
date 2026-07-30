"use server";

import { requirePermission } from "@/lib/access-guard";
import { getTenantDb } from "@/lib/tenant-db";
import type { Invoice, InvoiceLine, InvoiceStatus } from "@/data/padel/club/finance";

function paymentInvoiceStatus(status: string): InvoiceStatus {
  if (status === "paid" || status === "partially_refunded") return "paid";
  if (status === "pending") return "sent";
  return "draft";
}

export async function getInvoicesAction(): Promise<Invoice[]> {
  const guard = await requirePermission("finance.view", "view");
  if (!guard.ok) return [];
  const db = await getTenantDb(guard.session.dbConfig);
  const payments = await db.t_payment.findMany({
    where: { companyId: guard.session.companyId, isDeleted: 0 },
    include: {
      bookings: {
        include: {
          member: { select: { name: true, email: true } },
          details: {
            where: { isDeleted: 0 },
            include: { court: { select: { name: true } } },
          },
        },
      },
      histories: {
        include: { member: { select: { name: true, email: true } } },
      },
      posSale: { include: { items: { where: { isDeleted: 0 } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return payments.map((payment) => {
    const booking = payment.bookings[0];
    const history = payment.histories[0];
    const member = booking?.member ?? history?.member;
    const lines: InvoiceLine[] = [];
    for (const item of payment.posSale?.items ?? []) {
      lines.push({
        label: `${item.name} (${item.sku})`,
        qty: item.quantity,
        unitPrice: item.unitPrice,
      });
    }
    if (payment.posSale?.discount) {
      lines.push({
        label: payment.posSale.promoCode
          ? `Promo ${payment.posSale.promoCode}`
          : "Discount",
        qty: 1,
        unitPrice: -payment.posSale.discount,
      });
    }
    if (payment.posSale?.tax) {
      lines.push({ label: "Tax 11%", qty: 1, unitPrice: payment.posSale.tax });
    }
    for (const currentBooking of payment.bookings) {
      for (const detail of currentBooking.details) {
        lines.push({
          label: `${detail.court.name} · ${detail.start.toLocaleString("id-ID")}`,
          qty: 1,
          unitPrice: detail.price,
        });
      }
    }
    for (const currentHistory of payment.histories) {
      if (currentHistory.joinFee > 0) {
        lines.push({
          label: `Join membership ${currentHistory.planName}`,
          qty: 1,
          unitPrice: currentHistory.joinFee,
        });
      }
    }
    if (lines.length === 0) {
      lines.push({ label: "Pembayaran", qty: 1, unitPrice: payment.amount });
    }
    const date = payment.createdAt.toISOString().slice(0, 10);
    return {
      id: payment.id,
      number: `INV-${payment.paymentRef.replace(/^PAY-/, "")}`,
      customer:
        member?.name || payment.posSale?.customer || booking?.customer || "Walk-in",
      email: member?.email || "—",
      issuedAt: date,
      dueAt: date,
      status: paymentInvoiceStatus(payment.status),
      lines,
    };
  });
}
