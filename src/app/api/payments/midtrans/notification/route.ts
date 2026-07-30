import { NextResponse } from "next/server";
import { resolveTenantConfig } from "@/lib/auth";
import { masterPrisma } from "@/lib/master-db";
import { getTenantDb } from "@/lib/tenant-db";
import {
  isMidtransPaymentSettled,
  midtransCompanyToken,
  parseMidtransCompanyToken,
  verifyMidtransNotificationSignature,
  type MidtransStatus,
} from "@/lib/midtrans";
import { resolveMidtransConfig } from "@/lib/midtrans-config";

export const runtime = "nodejs";

function localStatus(payload: MidtransStatus): string {
  if (isMidtransPaymentSettled(payload)) return "paid";
  if (payload.transaction_status === "pending") return "pending";
  if (
    payload.transaction_status === "cancel" ||
    payload.transaction_status === "expire" ||
    payload.transaction_status === "deny"
  ) {
    return "cancelled";
  }
  if (payload.transaction_status === "refund") return "refunded";
  if (payload.transaction_status === "partial_refund") {
    return "partially_refunded";
  }
  return "failed";
}

export async function POST(request: Request) {
  let payload: MidtransStatus;
  try {
    payload = (await request.json()) as MidtransStatus;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const companyToken = payload.order_id
    ? parseMidtransCompanyToken(payload.order_id)
    : null;
  if (!companyToken) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  }

  try {
    const tenants = await masterPrisma.m_tenant.findMany({
      where: { status: { not: "suspended" } },
      select: { companyId: true },
    });
    const companyId = tenants.find(
      (tenant) => midtransCompanyToken(tenant.companyId) === companyToken,
    )?.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }
    const dbConfig = await resolveTenantConfig(companyId);
    if (!dbConfig) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }
    const db = await getTenantDb(dbConfig);
    const config = await resolveMidtransConfig(db, companyId);
    if (!verifyMidtransNotificationSignature(payload, config.serverKey)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    const payment = await db.t_payment.findFirst({
      where: {
        companyId,
        externalId: payload.order_id,
        isDeleted: 0,
      },
      select: { id: true },
    });
    if (payment) {
      const status = localStatus(payload);
      await db.t_payment.update({
        where: { id: payment.id },
        data: {
          status,
          provider: "midtrans",
          paidAt: status === "paid" ? new Date() : undefined,
          note: payload.payment_type
            ? `Midtrans: ${payload.payment_type}`
            : undefined,
          updatedBy: "midtrans-webhook",
        },
      });
    }
    // Midtrans retries non-2xx responses. Unknown-yet payments are accepted;
    // the browser finalization may persist them moments later.
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[midtrans notification] error:", err);
    return NextResponse.json(
      { error: "Notification processing failed." },
      { status: 500 },
    );
  }
}
