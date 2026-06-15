"use server";

import { cookies } from "next/headers";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";

export type OperatingHour = {
  day: number;
  open: boolean;
  openStart: number;
  openEnd: number;
};

export async function getOperatingHoursAction(): Promise<OperatingHour[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return [];

  const session: AuthSession = JSON.parse(raw);
  const db = await getTenantDb();

  const rows = await db.m_operating_hours.findMany({
    where: { companyId: session.companyId },
    orderBy: { day: "asc" },
  });

  return rows.map((r) => ({
    day: r.day,
    open: r.open,
    openStart: r.openStart,
    openEnd: r.openEnd,
  }));
}

export async function updateOperatingHourAction(
  day: number,
  patch: Partial<Omit<OperatingHour, "day">>,
): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return { success: false };

  const session: AuthSession = JSON.parse(raw);
  const db = await getTenantDb();

  await db.m_operating_hours.upsert({
    where: { companyId_day: { companyId: session.companyId, day } },
    update: patch,
    create: {
      companyId: session.companyId,
      day,
      open: patch.open ?? true,
      openStart: patch.openStart ?? 7,
      openEnd: patch.openEnd ?? 23,
    },
  });

  return { success: true };
}

export async function setAllOperatingHoursAction(
  hours: OperatingHour[],
): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return { success: false };

  const session: AuthSession = JSON.parse(raw);
  const db = await getTenantDb();

  for (const h of hours) {
    await db.m_operating_hours.upsert({
      where: { companyId_day: { companyId: session.companyId, day: h.day } },
      update: { open: h.open, openStart: h.openStart, openEnd: h.openEnd },
      create: { companyId: session.companyId, ...h },
    });
  }

  return { success: true };
}
