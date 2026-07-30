"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/tenant-client";
import { requirePermission } from "@/lib/access-guard";
import { getTenantDb } from "@/lib/tenant-db";
import { auditCreate, auditUpdate } from "@/lib/audit";
import { products as seedProducts, type Product } from "@/data/padel/engage/products";
import { seedEnginePromos } from "@/data/padel/engage/promo-engine";
import { calculatePosTotals, validatePosQuantity } from "@/lib/pos-rules";
import { validatePaymentInput } from "@/lib/payment-rules";
import { genPaymentRef, type PayMethod } from "@/lib/checkout-core";
import {
  buildMidtransOrderId,
  createMidtransSnapTransaction,
  getMidtransTransactionStatus,
  isMidtransPaymentSettled,
  midtransOrderBelongsToCompany,
} from "@/lib/midtrans";
import { resolveMidtransConfig } from "@/lib/midtrans-config";

export type PosLineInput = { productId: string; quantity: number };

export type PosCheckoutInput = {
  lines: PosLineInput[];
  method: PayMethod;
  cashReceived?: number;
  promoCode?: string;
  providerOrderId?: string;
};

export type PosReceipt = {
  receiptNo: string;
  paymentRef: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
};

function mapProduct(row: {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  price: number;
  stock: number;
  emoji: string | null;
  sku: string;
  perHour: boolean;
  popular: boolean;
  active: boolean;
  image: string | null;
}): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Product["category"],
    brand: row.brand ?? undefined,
    price: row.price,
    stock: row.stock,
    emoji: row.emoji || "📦",
    sku: row.sku,
    perHour: row.perHour || undefined,
    popular: row.popular || undefined,
    active: row.active,
    image: row.image ?? undefined,
  };
}

async function seedProductsIfEmpty(
  db: Awaited<ReturnType<typeof getTenantDb>>,
  companyId: string,
  actor: string,
) {
  const count = await db.m_product.count({
    where: { companyId, isDeleted: 0 },
  });
  if (count > 0) return;
  await db.m_product.createMany({
    data: seedProducts.map((product) => ({
      companyId,
      sku: product.sku,
      name: product.name,
      category: product.category,
      brand: product.brand ?? null,
      price: product.price,
      stock: product.stock,
      emoji: product.emoji,
      image: product.image ?? null,
      perHour: Boolean(product.perHour),
      popular: Boolean(product.popular),
      active: product.active !== false,
      createdBy: actor,
    })),
    skipDuplicates: true,
  });
}

export async function getPosProductsAction(): Promise<Product[]> {
  const guard = await requirePermission("pos.view", "view");
  if (!guard.ok) return [];
  const db = await getTenantDb(guard.session.dbConfig);
  await seedProductsIfEmpty(db, guard.session.companyId, guard.session.userId);
  const rows = await db.m_product.findMany({
    where: { companyId: guard.session.companyId, isDeleted: 0 },
    orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }],
  });
  return rows.map(mapProduct);
}

export async function savePosProductAction(
  input: Product,
): Promise<{ success: boolean; product?: Product; error?: string }> {
  const guard = await requirePermission("pos.create", "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const name = input.name.trim();
  const sku = input.sku.trim().toUpperCase();
  if (!name || !sku || !Number.isSafeInteger(input.price) || input.price <= 0) {
    return { success: false, error: "Data produk tidak valid." };
  }
  if (!Number.isSafeInteger(input.stock) || input.stock < -1) {
    return { success: false, error: "Stok produk tidak valid." };
  }
  const db = await getTenantDb(guard.session.dbConfig);
  const data = {
    sku,
    name,
    category: input.category,
    brand: input.brand?.trim() || null,
    price: input.price,
    stock: input.stock,
    emoji: input.emoji || "📦",
    image: input.image || null,
    perHour: Boolean(input.perHour),
    popular: Boolean(input.popular),
    active: input.active !== false,
  };
  try {
    const existing = await db.m_product.findFirst({
      where: {
        id: input.id,
        companyId: guard.session.companyId,
        isDeleted: 0,
      },
    });
    const row = existing
      ? await db.m_product.update({
          where: { id: existing.id },
          data: { ...data, ...auditUpdate(guard.session.userId) },
        })
      : await db.m_product.create({
          data: {
            companyId: guard.session.companyId,
            ...data,
            ...auditCreate(guard.session.userId),
          },
        });
    revalidatePath("/pos");
    return { success: true, product: mapProduct(row) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { success: false, error: "SKU sudah digunakan." };
    }
    console.error("[savePosProductAction] error:", err);
    return { success: false, error: "Gagal menyimpan produk." };
  }
}

function promoDiscount(subtotal: number, rawCode?: string): number {
  const code = rawCode?.trim().toUpperCase();
  if (!code) return 0;
  const now = new Date().toISOString().slice(0, 10);
  const promo = seedEnginePromos.find(
    (item) =>
      item.code === code &&
      item.active &&
      item.appliesTo.includes("pos") &&
      item.audience === "all" &&
      item.validFrom <= now &&
      item.validTo >= now,
  );
  if (!promo || subtotal < (promo.minSpend ?? 0)) return 0;
  const raw =
    promo.type === "flat"
      ? promo.value
      : Math.round((subtotal * promo.value) / 100);
  return Math.min(raw, promo.maxDiscount ?? raw, subtotal);
}

async function priceCart(
  db: Awaited<ReturnType<typeof getTenantDb>>,
  companyId: string,
  input: PosCheckoutInput,
) {
  if (!input.lines.length || input.lines.length > 100) {
    throw new Error("Keranjang POS kosong atau terlalu besar.");
  }
  const quantities = new Map<string, number>();
  for (const line of input.lines) {
    quantities.set(
      line.productId,
      (quantities.get(line.productId) ?? 0) + line.quantity,
    );
  }
  const products = await db.m_product.findMany({
    where: {
      companyId,
      id: { in: [...quantities.keys()] },
      active: true,
      isDeleted: 0,
    },
  });
  if (products.length !== quantities.size) {
    throw new Error("Salah satu produk tidak tersedia.");
  }
  const lines = products.map((product) => {
    const quantity = validatePosQuantity(
      product.stock,
      quantities.get(product.id) ?? 0,
    );
    return {
      product,
      quantity,
      lineTotal: product.price * quantity,
    };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const totals = calculatePosTotals(
    subtotal,
    promoDiscount(subtotal, input.promoCode),
  );
  return { lines, ...totals };
}

export async function startPosMidtransAction(
  input: Omit<PosCheckoutInput, "providerOrderId">,
): Promise<{
  success: boolean;
  error?: string;
  token?: string;
  orderId?: string;
  clientKey?: string;
  production?: boolean;
}> {
  const guard = await requirePermission("pos.create", "create");
  if (!guard.ok) return { success: false, error: guard.error };
  try {
    const db = await getTenantDb(guard.session.dbConfig);
    const [cart, config] = await Promise.all([
      priceCart(db, guard.session.companyId, input),
      resolveMidtransConfig(db, guard.session.companyId),
    ]);
    const orderId = buildMidtransOrderId(guard.session.companyId);
    const snap = await createMidtransSnapTransaction(config, {
      orderId,
      grossAmount: cart.total,
      customer: { firstName: guard.session.userId },
      itemDetails: [
        ...cart.lines.map(({ product, quantity }) => ({
          id: product.sku.slice(0, 50),
          name: product.name.slice(0, 50),
          price: product.price,
          quantity,
        })),
        ...(cart.discount > 0
          ? [{ id: "DISCOUNT", name: "Promo discount", price: -cart.discount, quantity: 1 }]
          : []),
        ...(cart.tax > 0
          ? [{ id: "TAX", name: "Tax 11%", price: cart.tax, quantity: 1 }]
          : []),
      ],
    });
    return {
      success: true,
      token: snap.token,
      orderId,
      clientKey: config.clientKey,
      production: config.production,
    };
  } catch (err) {
    console.error("[startPosMidtransAction] error:", err);
    return { success: false, error: "Gagal memulai pembayaran Midtrans POS." };
  }
}

export async function checkoutPosAction(
  input: PosCheckoutInput,
): Promise<{ success: boolean; receipt?: PosReceipt; error?: string }> {
  const guard = await requirePermission("pos.create", "create");
  if (!guard.ok) return { success: false, error: guard.error };
  if (!["Cash", "QRIS", "Transfer"].includes(input.method)) {
    return { success: false, error: "Metode pembayaran POS tidak valid." };
  }
  const db = await getTenantDb(guard.session.dbConfig);
  try {
    const cart = await priceCart(db, guard.session.companyId, input);
    let verifiedAmount: number | undefined;
    if (input.method !== "Cash") {
      if (
        !input.providerOrderId ||
        !midtransOrderBelongsToCompany(
          input.providerOrderId,
          guard.session.companyId,
        )
      ) {
        return { success: false, error: "Referensi Midtrans tidak valid." };
      }
      const config = await resolveMidtransConfig(db, guard.session.companyId);
      const status = await getMidtransTransactionStatus(
        config,
        input.providerOrderId,
      );
      verifiedAmount = Number(status.gross_amount);
      if (
        status.order_id !== input.providerOrderId ||
        !isMidtransPaymentSettled(status) ||
        !Number.isSafeInteger(verifiedAmount) ||
        verifiedAmount !== cart.total
      ) {
        return { success: false, error: "Pembayaran Midtrans belum lunas atau nominal tidak sesuai." };
      }
    }

    const validation = validatePaymentInput({
      actor: "staff",
      method: input.method,
      total: cart.total,
      cashReceived: input.cashReceived,
      providerConfirmationId: input.providerOrderId,
    });
    if (!validation.ok) return { success: false, error: validation.error };
    if (verifiedAmount !== undefined && verifiedAmount !== cart.total) {
      return { success: false, error: "Nominal pembayaran berubah." };
    }

    const receipt = await db.$transaction(async (tx) => {
      for (const line of cart.lines) {
        if (line.product.stock === -1) continue;
        const updated = await tx.m_product.updateMany({
          where: {
            id: line.product.id,
            companyId: guard.session.companyId,
            stock: { gte: line.quantity },
            isDeleted: 0,
          },
          data: {
            stock: { decrement: line.quantity },
            updatedBy: guard.session.userId,
          },
        });
        if (updated.count !== 1) throw new Error("POS_STOCK_CHANGED");
      }

      const paymentRef = genPaymentRef();
      const payment = await tx.t_payment.create({
        data: {
          companyId: guard.session.companyId,
          paymentRef,
          method: input.method,
          amount: cart.total,
          posAmount: cart.total,
          status: "paid",
          paidByType: "staff",
          cashReceived: input.method === "Cash" ? input.cashReceived : null,
          cashChange: input.method === "Cash" ? validation.change : null,
          provider: input.providerOrderId ? "midtrans" : null,
          externalId: input.providerOrderId ?? null,
          paidAt: new Date(),
          ...auditCreate(guard.session.userId),
        },
      });
      const now = new Date();
      const receiptNo = `POS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${paymentRef.slice(-5)}`;
      await tx.t_pos_sale.create({
        data: {
          companyId: guard.session.companyId,
          receiptNo,
          paymentId: payment.id,
          subtotal: cart.subtotal,
          discount: cart.discount,
          tax: cart.tax,
          total: cart.total,
          promoCode: input.promoCode?.trim().toUpperCase() || null,
          ...auditCreate(guard.session.userId),
          items: {
            create: cart.lines.map((line) => ({
              companyId: guard.session.companyId,
              productId: line.product.id,
              sku: line.product.sku,
              name: line.product.name,
              unitPrice: line.product.price,
              quantity: line.quantity,
              lineTotal: line.lineTotal,
              ...auditCreate(guard.session.userId),
            })),
          },
        },
      });
      return {
        receiptNo,
        paymentRef,
        subtotal: cart.subtotal,
        discount: cart.discount,
        tax: cart.tax,
        total: cart.total,
        paid: input.method === "Cash" ? input.cashReceived ?? 0 : cart.total,
        change: validation.change,
      };
    }, { isolationLevel: "Serializable" });

    revalidatePath("/pos");
    revalidatePath("/finance");
    revalidatePath("/finance/invoices");
    return { success: true, receipt };
  } catch (err) {
    if (err instanceof Error && err.message === "POS_STOCK_CHANGED") {
      return { success: false, error: "Stok berubah. Muat ulang produk dan coba lagi." };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { success: false, error: "Pembayaran ini sudah pernah diproses." };
    }
    console.error("[checkoutPosAction] error:", err);
    return { success: false, error: "Gagal menyelesaikan transaksi POS." };
  }
}
