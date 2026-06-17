"use server";

// PadelHub — per-user menu OVERRIDE management (Access Control ▸ Users).
// Internal users live in the tenant DB (m_user). Their menu overrides live in
// m_user_menu (tenant DB) and sit on top of the role's m_role_menu grants.

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant-db";
import { masterPrisma } from "@/lib/master-db";
import { requirePermission } from "@/lib/access-guard";
import type { MenuActions } from "@/app/(admin)/access/actions";

export type InternalUser = {
  id: string;
  userId: string;
  name: string;
  roleKey: string;
  email: string | null;
  isActive: boolean;
};

/** List internal users (m_user) for the current tenant. */
export async function getInternalUsersAction(): Promise<InternalUser[]> {
  const guard = await requirePermission("access.roles", "view");
  if (!guard.ok) return [];
  const session = guard.session;
  const db = await getTenantDb();
  const rows = await db.m_user.findMany({
    where: { companyId: session.companyId, isDeleted: 0 },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((u) => ({
    id: u.id,
    userId: u.userId,
    name: u.namalengkap ?? u.userId,
    roleKey: u.roleKey,
    email: u.email,
    isActive: u.isActive,
  }));
}

export type UserMenuOverride = MenuActions & { menuKey: string };

/** Get a user's menu overrides (keyed by menuKey). */
export async function getUserMenuOverridesAction(
  userId: string,
): Promise<UserMenuOverride[]> {
  const guard = await requirePermission("access.roles", "view");
  if (!guard.ok) return [];
  const session = guard.session;
  const db = await getTenantDb();
  const rows = await db.m_user_menu.findMany({
    where: { companyId: session.companyId, userId, isDeleted: 0 },
  });
  return rows.map((o) => ({
    menuKey: o.menuKey,
    canView: o.canView,
    canCreate: o.canCreate,
    canUpdate: o.canUpdate,
    canDelete: o.canDelete,
    canCancel: o.canCancel,
    canImport: o.canImport,
    canExport: o.canExport,
  }));
}

export type SaveUserOverrideInput = MenuActions & { menuKey: string };

/**
 * Replace ALL overrides for a user. Rows with NO flags set are removed (so the
 * user falls back to the role grant for those menus). Only rows that differ
 * from a "no override" intent should be passed; here we simply store every row
 * with at least one flag, and delete the rest.
 */
export async function saveUserMenuOverridesAction(
  userId: string,
  rows: SaveUserOverrideInput[],
  /** menuKeys explicitly marked as "use role default" (override removed) */
  clearedKeys: string[],
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("access.roles", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();

  try {
    // remove cleared keys
    if (clearedKeys.length > 0) {
      await db.m_user_menu.deleteMany({
        where: { companyId: session.companyId, userId, menuKey: { in: clearedKeys } },
      });
    }
    // upsert each provided override row
    for (const r of rows) {
      await db.m_user_menu.upsert({
        where: { userId_menuKey: { userId, menuKey: r.menuKey } },
        update: {
          canView: r.canView,
          canCreate: r.canCreate,
          canUpdate: r.canUpdate,
          canDelete: r.canDelete,
          canCancel: r.canCancel,
          canImport: r.canImport,
          canExport: r.canExport,
          isDeleted: 0,
          updatedBy: session.userId,
        },
        create: {
          companyId: session.companyId,
          userId,
          menuKey: r.menuKey,
          canView: r.canView,
          canCreate: r.canCreate,
          canUpdate: r.canUpdate,
          canDelete: r.canDelete,
          canCancel: r.canCancel,
          canImport: r.canImport,
          canExport: r.canExport,
          createdBy: session.userId,
        },
      });
    }
    revalidatePath("/access/users");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[saveUserMenuOverridesAction] error:", err);
    return { success: false, error: "Gagal menyimpan override." };
  }
}

/** Clear ALL overrides for a user (revert fully to role grants). */
export async function clearUserOverridesAction(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("access.roles", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();
  await db.m_user_menu.deleteMany({
    where: { companyId: session.companyId, userId },
  });
  revalidatePath("/access/users");
  revalidatePath("/", "layout");
  return { success: true };
}

/** Resolve a role's default grants by menuKey (to seed the override editor). */
export async function getRoleDefaultsByKeyAction(
  roleKey: string,
): Promise<Record<string, MenuActions>> {
  const guard = await requirePermission("access.roles", "view");
  if (!guard.ok) return {};
  const role = await masterPrisma.m_role.findUnique({ where: { key: roleKey } });
  if (!role) return {};
  const perms = await masterPrisma.m_role_menu.findMany({
    where: { roleId: role.id, isDeleted: 0 },
    include: { menu: { select: { key: true } } },
  });
  const out: Record<string, MenuActions> = {};
  for (const p of perms) {
    if (!p.menu?.key) continue;
    out[p.menu.key] = {
      canView: p.canView,
      canCreate: p.canCreate,
      canUpdate: p.canUpdate,
      canDelete: p.canDelete,
      canCancel: p.canCancel,
      canImport: p.canImport,
      canExport: p.canExport,
    };
  }
  return out;
}
