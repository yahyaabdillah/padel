"use server";

// PadelHub — Company Settings server actions (tenant DB backed).
// Manages the per-tenant company profile (name, address, logo, contacts,
// timezone) plus the check-in operational settings (scanStaffBooking,
// strictWindow, checkinWindowMin). One m_company row per companyId.

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant-db";
import { masterPrisma } from "@/lib/master-db";
import { readSession, requirePermission } from "@/lib/access-guard";
import { auditCreate, auditUpdate, NOT_DELETED } from "@/lib/audit";
import { DEFAULT_CHECKIN_SETTINGS } from "@/lib/checkin-core";
import {
  encryptPaymentSecret,
  getPaymentEncryptionKey,
} from "@/lib/payment-config-crypto";

export type CompanyProfile = {
  name: string;
  address: string | null;
  logo: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  scanStaffBooking: boolean;
  strictWindow: boolean;
  checkinWindowMin: number;
  midtransEnabled: boolean;
  midtransProduction: boolean;
  midtransMerchantId: string | null;
  midtransClientKey: string | null;
  midtransServerKey: string;
  midtransServerKeyConfigured: boolean;
};

export type CompanyInput = {
  name: string;
  address?: string | null;
  logo?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone: string;
  scanStaffBooking: boolean;
  strictWindow: boolean;
  checkinWindowMin: number;
  midtransEnabled: boolean;
  midtransProduction: boolean;
  midtransMerchantId?: string | null;
  midtransClientKey?: string | null;
  /** Empty means preserve the existing encrypted server key. */
  midtransServerKey?: string;
};

/** Load the company profile for the active tenant, or safe defaults. */
export async function getCompanyAction(): Promise<CompanyProfile> {
  const session = await readSession();
  const fallbackName = "PadelHub";

  if (!session) {
    return {
      name: fallbackName,
      address: null,
      logo: null,
      phone: null,
      email: null,
      ...DEFAULT_CHECKIN_SETTINGS,
      midtransEnabled: false,
      midtransProduction: false,
      midtransMerchantId: null,
      midtransClientKey: null,
      midtransServerKey: "",
      midtransServerKeyConfigured: false,
    };
  }

  try {
    const db = await getTenantDb(session.dbConfig);
    const row = await db.m_company.findFirst({
      where: { companyId: session.companyId, ...NOT_DELETED },
    });
    if (row) {
      return {
        name: row.name,
        address: row.address,
        logo: row.logo,
        phone: row.phone,
        email: row.email,
        timezone: row.timezone,
        scanStaffBooking: row.scanStaffBooking,
        strictWindow: row.strictWindow,
        checkinWindowMin: row.checkinWindowMin,
        midtransEnabled: row.midtransEnabled,
        midtransProduction: row.midtransProduction,
        midtransMerchantId: row.midtransMerchantId,
        midtransClientKey: row.midtransClientKey,
        midtransServerKey: "",
        midtransServerKeyConfigured: Boolean(row.midtransServerKeyEncrypted),
      };
    }
  } catch (err) {
    console.error("[getCompanyAction] error:", err);
  }

  // No row yet — default the name from the tenant registry.
  let name = fallbackName;
  try {
    const tenant = await masterPrisma.m_tenant.findUnique({
      where: { companyId: session.companyId },
    });
    if (tenant?.name) name = tenant.name;
  } catch {
    /* best-effort */
  }

  return {
    name,
    address: null,
    logo: null,
    phone: null,
    email: null,
    ...DEFAULT_CHECKIN_SETTINGS,
    midtransEnabled: false,
    midtransProduction: false,
    midtransMerchantId: null,
    midtransClientKey: null,
    midtransServerKey: "",
    midtransServerKeyConfigured: false,
  };
}

/** Lightweight branding (name + logo) for the sidebar/header. */
export async function getCompanyBrandingAction(): Promise<{ name: string; logo: string | null }> {
  const session = await readSession();
  if (!session) return { name: "PadelHub", logo: null };
  try {
    const db = await getTenantDb(session.dbConfig);
    const row = await db.m_company.findFirst({
      where: { companyId: session.companyId, ...NOT_DELETED },
      select: { name: true, logo: true },
    });
    if (row) return { name: row.name, logo: row.logo };
  } catch (err) {
    console.error("[getCompanyBrandingAction] error:", err);
  }
  // fall back to tenant registry name
  try {
    const tenant = await masterPrisma.m_tenant.findUnique({
      where: { companyId: session.companyId },
      select: { name: true },
    });
    if (tenant?.name) return { name: tenant.name, logo: null };
  } catch {
    /* best-effort */
  }
  return { name: "PadelHub", logo: null };
}

/** Upsert the company profile. */
export async function saveCompanyAction(
  input: CompanyInput,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("settings.company", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;

  if (!input.name?.trim()) {
    return { success: false, error: "Nama perusahaan wajib diisi." };
  }

  const windowMin = Number.isFinite(input.checkinWindowMin)
    ? Math.max(0, Math.floor(input.checkinWindowMin))
    : DEFAULT_CHECKIN_SETTINGS.checkinWindowMin;

  try {
    const db = await getTenantDb(session.dbConfig);
    const existing = await db.m_company.findFirst({
      where: { companyId: session.companyId, ...NOT_DELETED },
    });

    const merchantId = input.midtransMerchantId?.trim() || null;
    const clientKey = input.midtransClientKey?.trim() || null;
    const suppliedServerKey = input.midtransServerKey?.trim() || "";
    const serverKeyEncrypted = suppliedServerKey
      ? encryptPaymentSecret(suppliedServerKey, getPaymentEncryptionKey())
      : existing?.midtransServerKeyEncrypted ?? null;
    if (
      input.midtransEnabled &&
      (!merchantId || !clientKey || !serverKeyEncrypted)
    ) {
      return {
        success: false,
        error: "Merchant ID, Client Key, dan Server Key Midtrans wajib diisi.",
      };
    }

    const data = {
      name: input.name.trim(),
      address: input.address?.trim() || null,
      logo: input.logo?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      timezone: input.timezone?.trim() || DEFAULT_CHECKIN_SETTINGS.timezone,
      scanStaffBooking: Boolean(input.scanStaffBooking),
      strictWindow: Boolean(input.strictWindow),
      checkinWindowMin: windowMin,
      midtransEnabled: Boolean(input.midtransEnabled),
      midtransProduction: Boolean(input.midtransProduction),
      midtransMerchantId: merchantId,
      midtransClientKey: clientKey,
      midtransServerKeyEncrypted: serverKeyEncrypted,
    };

    if (existing) {
      await db.m_company.update({
        where: { id: existing.id },
        data: { ...data, ...auditUpdate(session.userId) },
      });
    } else {
      await db.m_company.create({
        data: {
          companyId: session.companyId,
          ...data,
          ...auditCreate(session.userId),
        },
      });
    }

    revalidatePath("/settings/company");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[saveCompanyAction] error:", err);
    return { success: false, error: "Gagal menyimpan pengaturan perusahaan." };
  }
}

/** Persist a cropped logo (data URL) to /public/images/logo, return its path. */
export async function uploadLogoAction(
  dataUrl: string,
): Promise<{ success: boolean; path?: string; error?: string }> {
  const guard = await requirePermission("settings.company", "update");
  if (!guard.ok) return { success: false, error: guard.error };

  const match = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) return { success: false, error: "Format gambar tidak valid." };

  const mime = match[1];
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const buffer = Buffer.from(match[3], "base64");

  if (buffer.byteLength > 8 * 1024 * 1024) {
    return { success: false, error: "Ukuran gambar melebihi 8MB." };
  }

  try {
    const dir = path.join(process.cwd(), "public", "images", "logo");
    await mkdir(dir, { recursive: true });
    const filename = `logo-${randomUUID()}.${ext}`;
    await writeFile(path.join(dir, filename), buffer);
    return { success: true, path: `/images/logo/${filename}` };
  } catch (err) {
    console.error("[uploadLogoAction] error:", err);
    return { success: false, error: "Gagal menyimpan logo." };
  }
}
