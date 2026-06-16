"use server";

import { cookies } from "next/headers";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";
import { auditCreate, auditSoftDelete, auditUpdate, NOT_DELETED } from "@/lib/audit";
import { revalidatePath } from "next/cache";

async function requireSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export type MaintenanceKind = "maintenance" | "holiday" | "private_event" | "other";

export type MaintenanceRecord = {
  id: string;
  courtId: string;
  courtName: string;
  courtColor: string;
  start: string; // ISO (local, no tz shift)
  end: string; // ISO
  reason: string;
  kind: MaintenanceKind;
  createdBy: string;
};

export type MaintenanceInput = {
  courtId: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  reason: string;
  kind: MaintenanceKind;
};

const pad = (n: number) => String(n).padStart(2, "0");
const local = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:00`;

/** List maintenance windows for the tenant (soonest first), with court info. */
export async function getMaintenanceAction(): Promise<MaintenanceRecord[]> {
  const session = await requireSession();
  if (!session) return [];
  const db = await getTenantDb();
  const rows = await db.m_court_maintenance.findMany({
    where: { companyId: session.companyId, ...NOT_DELETED },
    orderBy: { start: "asc" },
    include: { court: { select: { name: true, color: true } } },
  });
  return rows.map((m) => ({
    id: m.id,
    courtId: m.courtId,
    courtName: m.court?.name ?? "—",
    courtColor: m.court?.color ?? "#6D5BFF",
    start: local(m.start),
    end: local(m.end),
    reason: m.reason,
    kind: m.kind as MaintenanceKind,
    createdBy: m.createdBy ?? "",
  }));
}

/** Create a maintenance / closure window. */
export async function createMaintenanceAction(
  input: MaintenanceInput,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const session = await requireSession();
    if (!session) return { success: false, error: "Not authenticated." };
    if (!input.courtId) return { success: false, error: "Pilih lapangan." };
    if (!input.reason.trim()) return { success: false, error: "Isi alasan." };
    const start = new Date(input.start);
    const end = new Date(input.end);
    if (!(end > start)) {
      return { success: false, error: "Waktu selesai harus setelah waktu mulai." };
    }

    const db = await getTenantDb();
    const created = await db.m_court_maintenance.create({
      data: {
        companyId: session.companyId,
        courtId: input.courtId,
        start,
        end,
        reason: input.reason.trim(),
        kind: input.kind,
        ...auditCreate(session.userId),
      },
    });
    revalidatePath("/maintenance");
    return { success: true, id: created.id };
  } catch (err) {
    console.error("[createMaintenanceAction] error:", err);
    return { success: false, error: "Gagal menyimpan jadwal maintenance." };
  }
}

/** Update a maintenance window. */
export async function updateMaintenanceAction(
  id: string,
  patch: Partial<MaintenanceInput>,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();
  if (!session) return { success: false, error: "Not authenticated." };
  const db = await getTenantDb();
  await db.m_court_maintenance.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: {
      ...(patch.courtId !== undefined && { courtId: patch.courtId }),
      ...(patch.start !== undefined && { start: new Date(patch.start) }),
      ...(patch.end !== undefined && { end: new Date(patch.end) }),
      ...(patch.reason !== undefined && { reason: patch.reason.trim() }),
      ...(patch.kind !== undefined && { kind: patch.kind }),
      ...auditUpdate(session.userId),
    },
  });
  revalidatePath("/maintenance");
  return { success: true };
}

/** Soft-delete a maintenance window. */
export async function deleteMaintenanceAction(
  id: string,
): Promise<{ success: boolean }> {
  const session = await requireSession();
  if (!session) return { success: false };
  const db = await getTenantDb();
  await db.m_court_maintenance.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: auditSoftDelete(session.userId),
  });
  revalidatePath("/maintenance");
  return { success: true };
}
