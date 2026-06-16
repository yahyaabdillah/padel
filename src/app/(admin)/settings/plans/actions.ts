"use server";

import { cookies } from "next/headers";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";
import { auditCreate, auditSoftDelete, auditUpdate, NOT_DELETED } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/tenant-client";

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

export type PlanRecord = {
  id: string;
  name: string;
  color: string;
  joinFee: number;
  includedCourtBookings: number;
  resetPeriodDays: number;
  freeCoaching: number;
  courtDiscountPct: number;
  perks: string[];
  active: boolean;
  highlighted: boolean;
  sortOrder: number;
};

export type PlanInput = Omit<PlanRecord, "id">;

function toRecord(p: {
  id: string;
  name: string;
  color: string;
  joinFee: number;
  includedCourtBookings: number;
  resetPeriodDays: number;
  freeCoaching: number;
  courtDiscountPct: number;
  perks: unknown;
  active: boolean;
  highlighted: boolean;
  sortOrder: number;
}): PlanRecord {
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    joinFee: p.joinFee,
    includedCourtBookings: p.includedCourtBookings,
    resetPeriodDays: p.resetPeriodDays,
    freeCoaching: p.freeCoaching,
    courtDiscountPct: p.courtDiscountPct,
    perks: Array.isArray(p.perks) ? (p.perks as string[]) : [],
    active: p.active,
    highlighted: p.highlighted,
    sortOrder: p.sortOrder,
  };
}

/** List membership plans for the tenant (by sort order). */
export async function getPlansAction(): Promise<PlanRecord[]> {
  const session = await requireSession();
  if (!session) return [];
  const db = await getTenantDb();
  const rows = await db.m_membership_plan.findMany({
    where: { companyId: session.companyId, ...NOT_DELETED },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toRecord);
}

export async function createPlanAction(
  input: PlanInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const session = await requireSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (!input.name.trim()) return { success: false, error: "Nama plan wajib diisi." };
  const db = await getTenantDb();
  const created = await db.m_membership_plan.create({
    data: {
      companyId: session.companyId,
      name: input.name.trim(),
      color: input.color,
      joinFee: input.joinFee,
      includedCourtBookings: input.includedCourtBookings,
      resetPeriodDays: input.resetPeriodDays,
      freeCoaching: input.freeCoaching,
      courtDiscountPct: input.courtDiscountPct,
      perks: input.perks as Prisma.InputJsonValue,
      active: input.active,
      highlighted: input.highlighted,
      sortOrder: input.sortOrder,
      ...auditCreate(session.userId),
    },
  });
  revalidatePath("/settings/plans");
  return { success: true, id: created.id };
}

export async function updatePlanAction(
  id: string,
  patch: Partial<PlanInput>,
): Promise<{ success: boolean }> {
  const session = await requireSession();
  if (!session) return { success: false };
  const db = await getTenantDb();
  await db.m_membership_plan.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: {
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.color !== undefined && { color: patch.color }),
      ...(patch.joinFee !== undefined && { joinFee: patch.joinFee }),
      ...(patch.includedCourtBookings !== undefined && {
        includedCourtBookings: patch.includedCourtBookings,
      }),
      ...(patch.resetPeriodDays !== undefined && { resetPeriodDays: patch.resetPeriodDays }),
      ...(patch.freeCoaching !== undefined && { freeCoaching: patch.freeCoaching }),
      ...(patch.courtDiscountPct !== undefined && { courtDiscountPct: patch.courtDiscountPct }),
      ...(patch.perks !== undefined && { perks: patch.perks as Prisma.InputJsonValue }),
      ...(patch.active !== undefined && { active: patch.active }),
      ...(patch.highlighted !== undefined && { highlighted: patch.highlighted }),
      ...(patch.sortOrder !== undefined && { sortOrder: patch.sortOrder }),
      ...auditUpdate(session.userId),
    },
  });
  revalidatePath("/settings/plans");
  return { success: true };
}

export async function deletePlanAction(id: string): Promise<{ success: boolean }> {
  const session = await requireSession();
  if (!session) return { success: false };
  const db = await getTenantDb();
  await db.m_membership_plan.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: auditSoftDelete(session.userId),
  });
  revalidatePath("/settings/plans");
  return { success: true };
}
