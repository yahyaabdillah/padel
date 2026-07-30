import type { PrismaClient } from "@prisma/tenant-client";
import {
  decryptPaymentSecret,
  getPaymentEncryptionKey,
} from "@/lib/payment-config-crypto";
import type { MidtransConfig } from "@/lib/midtrans";

export async function resolveMidtransConfig(
  db: PrismaClient,
  companyId: string,
): Promise<MidtransConfig> {
  const company = await db.m_company.findFirst({
    where: { companyId, isDeleted: 0 },
    select: {
      midtransEnabled: true,
      midtransProduction: true,
      midtransClientKey: true,
      midtransServerKeyEncrypted: true,
    },
  });
  if (
    !company?.midtransEnabled ||
    !company.midtransClientKey ||
    !company.midtransServerKeyEncrypted
  ) {
    throw new Error("MIDTRANS_NOT_CONFIGURED");
  }
  return {
    clientKey: company.midtransClientKey,
    serverKey: decryptPaymentSecret(
      company.midtransServerKeyEncrypted,
      getPaymentEncryptionKey(),
    ),
    production: company.midtransProduction,
  };
}
