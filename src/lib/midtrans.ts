import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

export interface MidtransConfig {
  clientKey: string;
  serverKey: string;
  production: boolean;
}

export interface MidtransStatus {
  order_id?: string;
  transaction_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  payment_type?: string;
}

export interface MidtransSnapResult {
  token: string;
  redirect_url: string;
}

const SANDBOX_SNAP = "https://app.sandbox.midtrans.com";
const PRODUCTION_SNAP = "https://app.midtrans.com";
const SANDBOX_API = "https://api.sandbox.midtrans.com";
const PRODUCTION_API = "https://api.midtrans.com";

export function midtransSnapScriptUrl(production: boolean): string {
  return `${production ? PRODUCTION_SNAP : SANDBOX_SNAP}/snap/snap.js`;
}

export function buildMidtransOrderId(companyId: string): string {
  const tenant = midtransCompanyToken(companyId);
  const nonce = randomUUID().replaceAll("-", "").slice(0, 20);
  return `MID-${tenant}-${nonce}`;
}

export function midtransCompanyToken(companyId: string): string {
  return createHash("sha256")
    .update(companyId.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

export function parseMidtransCompanyToken(orderId: string): string | null {
  return /^MID-([0-9a-f]{16})-[0-9a-f]{20}$/i.exec(orderId)?.[1] ?? null;
}

export function midtransOrderBelongsToCompany(
  orderId: string,
  companyId: string,
): boolean {
  return parseMidtransCompanyToken(orderId) === midtransCompanyToken(companyId);
}

export function verifyMidtransNotificationSignature(
  payload: Pick<
    MidtransStatus,
    "order_id" | "status_code" | "gross_amount" | "signature_key"
  >,
  serverKey: string,
): boolean {
  if (
    !payload.order_id ||
    !payload.status_code ||
    !payload.gross_amount ||
    !payload.signature_key
  ) {
    return false;
  }
  const expected = createHash("sha512")
    .update(
      `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`,
    )
    .digest();
  const actual = Buffer.from(payload.signature_key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isMidtransPaymentSettled(status: MidtransStatus): boolean {
  if (status.transaction_status === "settlement") return true;
  return (
    status.transaction_status === "capture" &&
    status.fraud_status !== "challenge" &&
    status.fraud_status !== "deny"
  );
}

function authorization(serverKey: string): string {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

async function readMidtransResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | (T & { status_message?: string })
    | null;
  if (!response.ok || !body) {
    throw new Error(body?.status_message || "Midtrans tidak dapat dihubungi.");
  }
  return body;
}

export async function createMidtransSnapTransaction(
  config: MidtransConfig,
  input: {
    orderId: string;
    grossAmount: number;
    customer: { firstName: string; email?: string | null; phone?: string | null };
    itemDetails: Array<{ id: string; name: string; price: number; quantity: number }>;
  },
): Promise<MidtransSnapResult> {
  if (!Number.isSafeInteger(input.grossAmount) || input.grossAmount <= 0) {
    throw new Error("Nominal Midtrans tidak valid.");
  }
  const response = await fetch(
    `${config.production ? PRODUCTION_SNAP : SANDBOX_SNAP}/snap/v1/transactions`,
    {
      method: "POST",
      headers: {
        Authorization: authorization(config.serverKey),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: input.orderId,
          gross_amount: input.grossAmount,
        },
        customer_details: {
          first_name: input.customer.firstName.slice(0, 50),
          email: input.customer.email || undefined,
          phone: input.customer.phone || undefined,
        },
        item_details: input.itemDetails,
        credit_card: { secure: true },
      }),
      cache: "no-store",
    },
  );
  return readMidtransResponse<MidtransSnapResult>(response);
}

export async function getMidtransTransactionStatus(
  config: MidtransConfig,
  orderId: string,
): Promise<MidtransStatus> {
  const response = await fetch(
    `${config.production ? PRODUCTION_API : SANDBOX_API}/v2/${encodeURIComponent(orderId)}/status`,
    {
      headers: {
        Authorization: authorization(config.serverKey),
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  return readMidtransResponse<MidtransStatus>(response);
}
