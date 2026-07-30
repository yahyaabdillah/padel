"use server";

import { cookies } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";
import { auditCreate } from "@/lib/audit";
import { requirePermission } from "@/lib/access-guard";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/tenant-client";

export type Court = {
  id: string;
  name: string;
  environment: string;
  wall: string;
  format: string;
  status: string;
  priceOffPeak: number;
  pricePeak: number;
  schedule: unknown;
  color: string;
  note?: string | null;
  image?: string | null;
};

/**
 * Persist a cropped court image (data URL) to /public/images/courts and return
 * its public path. Replaces the previous inline-base64 approach so the DB only
 * stores a short path.
 */
export async function uploadCourtImageAction(
  dataUrl: string,
): Promise<{ success: boolean; path?: string; error?: string }> {
  // uploading an image is part of the court create/update flow
  const guard = await requirePermission("master.courts", "update");
  if (!guard.ok) {
    const createGuard = await requirePermission("master.courts", "create");
    if (!createGuard.ok) return { success: false, error: createGuard.error };
  }

  const match = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) return { success: false, error: "Format gambar tidak valid." };

  const mime = match[1];
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const buffer = Buffer.from(match[3], "base64");

  // basic size guard (~8MB decoded)
  if (buffer.byteLength > 8 * 1024 * 1024) {
    return { success: false, error: "Ukuran gambar melebihi 8MB." };
  }

  try {
    const dir = path.join(process.cwd(), "public", "images", "courts");
    await mkdir(dir, { recursive: true });
    const filename = `court-${randomUUID()}.${ext}`;
    await writeFile(path.join(dir, filename), buffer);
    return { success: true, path: `/images/courts/${filename}` };
  } catch (err) {
    console.error("[uploadCourtImageAction] error:", err);
    return { success: false, error: "Gagal menyimpan gambar." };
  }
}

export async function getCourtsAction(): Promise<Court[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return [];

  const session: AuthSession = JSON.parse(raw);
  const db = await getTenantDb();

  const rows = await db.m_court.findMany({
    where: { companyId: session.companyId, isDeleted: 0 },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    environment: r.environment,
    wall: r.wall,
    format: r.format,
    status: r.status,
    priceOffPeak: r.priceOffPeak,
    pricePeak: r.pricePeak,
    schedule: r.schedule,
    color: r.color,
    note: r.note,
    image: r.image,
  }));
}

export async function getCourtByIdAction(id: string): Promise<Court | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const session: AuthSession = JSON.parse(raw);
  const db = await getTenantDb();

  const row = await db.m_court.findFirst({
    where: { id, companyId: session.companyId, isDeleted: 0 },
  });

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    environment: row.environment,
    wall: row.wall,
    format: row.format,
    status: row.status,
    priceOffPeak: row.priceOffPeak,
    pricePeak: row.pricePeak,
    schedule: row.schedule,
    color: row.color,
    note: row.note,
    image: row.image,
  };
}

export async function createCourtAction(
  data: Omit<Court, "id">,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const guard = await requirePermission("master.courts", "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();

  const created = await db.m_court.create({
    data: {
      companyId: session.companyId,
      name: data.name,
      environment: data.environment,
      wall: data.wall,
      format: data.format,
      status: data.status,
      priceOffPeak: data.priceOffPeak,
      pricePeak: data.pricePeak,
      schedule: data.schedule as Prisma.InputJsonValue,
      color: data.color,
      note: data.note,
      image: data.image,
      ...auditCreate(session.userId),
    },
  });

  revalidatePath("/courts");
  return { success: true, id: created.id };
}

export async function updateCourtAction(
  id: string,
  data: Partial<Omit<Court, "id">>,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("master.courts", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();

  await db.m_court.updateMany({
    where: { id, companyId: session.companyId, isDeleted: 0 },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.environment !== undefined && { environment: data.environment }),
      ...(data.wall !== undefined && { wall: data.wall }),
      ...(data.format !== undefined && { format: data.format }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.priceOffPeak !== undefined && { priceOffPeak: data.priceOffPeak }),
      ...(data.pricePeak !== undefined && { pricePeak: data.pricePeak }),
      ...(data.schedule !== undefined && { schedule: data.schedule as Prisma.InputJsonValue }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.note !== undefined && { note: data.note }),
      ...(data.image !== undefined && { image: data.image }),
      updatedBy: session.userId,
    },
  });

  revalidatePath("/courts");
  return { success: true };
}

export async function deleteCourtAction(id: string): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("master.courts", "delete");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();

  await db.m_court.updateMany({
    where: { id, companyId: session.companyId, isDeleted: 0 },
    data: { isDeleted: 1, deletedAt: new Date(), deletedBy: session.userId },
  });

  revalidatePath("/courts");
  return { success: true };
}
