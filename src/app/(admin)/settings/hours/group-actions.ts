"use server";

// PadelHub — time-of-day groupings (Pagi/Siang/Sore/Malam etc). Club-wide
// buckets that segment the booking day. Each group's [startHour, endHour) must
// fall within the club's overall operating window (the widest open range across
// open weekdays). Guarded by the same menu as operating hours (master.hours).

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant-db";
import { auditCreate, auditUpdate, auditSoftDelete, NOT_DELETED } from "@/lib/audit";
import { readSession, requirePermission } from "@/lib/access-guard";

export type TimeGroup = {
  id: string;
  name: string;
  startHour: number;
  endHour: number;
  color: string;
  sortOrder: number;
};

export type TimeGroupInput = {
  name: string;
  startHour: number;
  endHour: number;
  color?: string;
  sortOrder?: number;
};

/** The club's widest operating window across OPEN weekdays — used to validate
 * that a grouping range stays inside operating hours. */
async function operatingBounds(
  db: Awaited<ReturnType<typeof getTenantDb>>,
  companyId: string,
): Promise<{ minStart: number; maxEnd: number } | null> {
  const rows = await db.m_operating_hours.findMany({
    where: { companyId, open: true },
  });
  if (rows.length === 0) return null;
  const minStart = Math.min(...rows.map((r) => r.openStart));
  const maxEnd = Math.max(...rows.map((r) => r.openEnd));
  return { minStart, maxEnd };
}

export async function getTimeGroupsAction(): Promise<TimeGroup[]> {
  const session = await readSession();
  if (!session) return [];
  const db = await getTenantDb(session.dbConfig);
  const rows = await db.m_time_group.findMany({
    where: { companyId: session.companyId, ...NOT_DELETED },
    orderBy: [{ sortOrder: "asc" }, { startHour: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    startHour: r.startHour,
    endHour: r.endHour,
    color: r.color,
    sortOrder: r.sortOrder,
  }));
}

/** Validate a group range against operating hours + basic sanity. */
async function validateRange(
  db: Awaited<ReturnType<typeof getTenantDb>>,
  companyId: string,
  startHour: number,
  endHour: number,
): Promise<string | null> {
  if (!Number.isInteger(startHour) || !Number.isInteger(endHour)) {
    return "Jam harus berupa angka.";
  }
  if (startHour < 0 || startHour > 23) return "Jam mulai tidak valid.";
  if (endHour < 1 || endHour > 24) return "Jam selesai tidak valid.";
  if (endHour <= startHour) return "Jam selesai harus setelah jam mulai.";

  const bounds = await operatingBounds(db, companyId);
  if (!bounds) return "Atur jam operasional terlebih dulu.";
  if (startHour < bounds.minStart || endHour > bounds.maxEnd) {
    const lbl = (h: number) => `${String(h).padStart(2, "0")}:00`;
    return `Grouping harus dalam jam operasional (${lbl(bounds.minStart)}–${lbl(bounds.maxEnd)}).`;
  }
  return null;
}

export async function upsertTimeGroupAction(
  id: string | null,
  input: TimeGroupInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const guard = await requirePermission("master.hours", id ? "update" : "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb(session.dbConfig);

  if (!input.name.trim()) return { success: false, error: "Nama grouping wajib diisi." };
  const rangeErr = await validateRange(db, session.companyId, input.startHour, input.endHour);
  if (rangeErr) return { success: false, error: rangeErr };

  try {
    if (id) {
      await db.m_time_group.updateMany({
        where: { id, companyId: session.companyId, ...NOT_DELETED },
        data: {
          name: input.name.trim(),
          startHour: input.startHour,
          endHour: input.endHour,
          color: input.color ?? undefined,
          sortOrder: input.sortOrder ?? undefined,
          ...auditUpdate(session.userId),
        },
      });
      revalidatePath("/settings/hours");
      return { success: true, id };
    }
    const count = await db.m_time_group.count({
      where: { companyId: session.companyId, ...NOT_DELETED },
    });
    const created = await db.m_time_group.create({
      data: {
        companyId: session.companyId,
        name: input.name.trim(),
        startHour: input.startHour,
        endHour: input.endHour,
        color: input.color ?? "#6D5BFF",
        sortOrder: input.sortOrder ?? count,
        ...auditCreate(session.userId),
      },
    });
    revalidatePath("/settings/hours");
    return { success: true, id: created.id };
  } catch (err) {
    console.error("[upsertTimeGroupAction] error:", err);
    return { success: false, error: "Gagal menyimpan grouping." };
  }
}

export async function deleteTimeGroupAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("master.hours", "delete");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb(session.dbConfig);
  await db.m_time_group.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: auditSoftDelete(session.userId),
  });
  revalidatePath("/settings/hours");
  return { success: true };
}
