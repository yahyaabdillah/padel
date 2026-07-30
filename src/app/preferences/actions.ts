"use server";

import { readSession } from "@/lib/access-guard";
import { auditUpdate, NOT_DELETED } from "@/lib/audit";
import { getTenantDb } from "@/lib/tenant-db";
import { brandPresets } from "@/data/padel/platform/settings";
import {
  normalizeUserPreferences,
  type UserPreferences,
  type UserTheme,
} from "@/lib/user-preferences";

const paletteIds = brandPresets.map((preset) => preset.id);

export async function getMyAppearanceAction(): Promise<UserPreferences | null> {
  const session = await readSession();
  if (!session) return null;
  const db = await getTenantDb(session.dbConfig);
  const row = session.role === "member"
    ? await db.t_member.findFirst({
        where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
        select: { theme: true, paletteId: true },
      })
    : await db.m_user.findFirst({
        where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
        select: { theme: true, paletteId: true },
      });
  return row ? normalizeUserPreferences(row, paletteIds) : null;
}

export async function updateMyAppearanceAction(input: {
  theme: UserTheme;
  paletteId: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await readSession();
  if (!session) return { success: false, error: "Not authenticated." };
  const preferences = normalizeUserPreferences(input, paletteIds);
  if (preferences.theme !== input.theme || preferences.paletteId !== input.paletteId) {
    return { success: false, error: "Preferensi tampilan tidak valid." };
  }
  const db = await getTenantDb(session.dbConfig);
  const data = { ...preferences, ...auditUpdate(session.userId) };
  const result = session.role === "member"
    ? await db.t_member.updateMany({
        where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
        data,
      })
    : await db.m_user.updateMany({
        where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
        data,
      });
  return result.count === 1
    ? { success: true }
    : { success: false, error: "User tidak ditemukan." };
}
