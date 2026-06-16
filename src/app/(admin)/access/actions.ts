"use server";

// PadelHub — Access Control server actions (master DB backed).
// Manages roles, the menu catalog, and the per-(role, menu) action matrix
// (view/create/update/delete/import/export). Also resolves the effective
// menu + action grants for the current session's role so the sidebar and
// page actions can be gated dynamically.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { masterPrisma } from "@/lib/master-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";

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

const NOT_DELETED = { isDeleted: 0 } as const;

/* ════════════════════════════════════════════════════════
 *  TYPES
 * ════════════════════════════════════════════════════════ */

export type RoleRecord = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scope: string;
  level: number;
  isSystem: boolean;
};

export type MenuRecord = {
  id: string;
  key: string;
  label: string;
  path: string;
  icon: string;
  parentKey: string | null;
  groupKey: string;
  section: string;
  sortOrder: number;
  badge: string | null;
  isActive: boolean;
};

export type MenuActions = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canCancel: boolean;
  canImport: boolean;
  canExport: boolean;
};

export type RoleMenuPermission = MenuActions & { menuId: string; menuKey: string };

/* ════════════════════════════════════════════════════════
 *  ROLES
 * ════════════════════════════════════════════════════════ */

export async function getRolesAction(): Promise<RoleRecord[]> {
  const session = await requireSession();
  if (!session) return [];
  const rows = await masterPrisma.m_role.findMany({
    where: { ...NOT_DELETED },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    scope: r.scope,
    level: r.level,
    isSystem: r.isSystem,
  }));
}

export type RoleInput = {
  key?: string;
  name: string;
  description?: string;
  scope?: string;
  level?: number;
};

export async function upsertRoleAction(
  id: string | null,
  input: RoleInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const session = await requireSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (!input.name.trim()) return { success: false, error: "Nama role wajib diisi." };

  try {
    if (id) {
      const existing = await masterPrisma.m_role.findUnique({ where: { id } });
      if (!existing) return { success: false, error: "Role tidak ditemukan." };
      await masterPrisma.m_role.update({
        where: { id },
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          scope: input.scope ?? existing.scope,
          level: input.level ?? existing.level,
          updatedBy: session.userId,
        },
      });
      revalidatePath("/access/roles");
      return { success: true, id };
    }
    // create — derive a stable key from the name unless provided
    const key =
      (input.key || input.name)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/(^_|_$)/g, "") || `role_${Date.now().toString(36)}`;
    const clash = await masterPrisma.m_role.findUnique({ where: { key } });
    if (clash) return { success: false, error: "Key role sudah dipakai." };
    const created = await masterPrisma.m_role.create({
      data: {
        key,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        scope: input.scope ?? "club",
        level: input.level ?? 5,
        isSystem: false,
        createdBy: session.userId,
      },
    });
    revalidatePath("/access/roles");
    return { success: true, id: created.id };
  } catch (err) {
    console.error("[upsertRoleAction] error:", err);
    return { success: false, error: "Gagal menyimpan role." };
  }
}

export async function deleteRoleAction(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();
  if (!session) return { success: false, error: "Not authenticated." };
  const role = await masterPrisma.m_role.findUnique({ where: { id } });
  if (!role) return { success: false, error: "Role tidak ditemukan." };
  if (role.isSystem) return { success: false, error: "Role sistem tidak bisa dihapus." };
  await masterPrisma.m_role.update({
    where: { id },
    data: { isDeleted: 1, deletedAt: new Date(), deletedBy: session.userId },
  });
  revalidatePath("/access/roles");
  return { success: true };
}

/* ════════════════════════════════════════════════════════
 *  MENUS (catalog)
 * ════════════════════════════════════════════════════════ */

export async function getMenusAction(): Promise<MenuRecord[]> {
  const session = await requireSession();
  if (!session) return [];
  const rows = await masterPrisma.m_menu.findMany({
    where: { ...NOT_DELETED },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((m) => ({
    id: m.id,
    key: m.key,
    label: m.label,
    path: m.path,
    icon: m.icon,
    parentKey: m.parentKey,
    groupKey: m.groupKey,
    section: m.section,
    sortOrder: m.sortOrder,
    badge: m.badge,
    isActive: m.isActive,
  }));
}

export type MenuInput = {
  key?: string;
  label: string;
  path: string;
  icon: string;
  parentKey: string | null;
  groupKey: string;
  section: string;
  sortOrder: number;
  badge?: string | null;
  isActive: boolean;
};

export async function upsertMenuAction(
  id: string | null,
  input: MenuInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const session = await requireSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (!input.label.trim()) return { success: false, error: "Label menu wajib diisi." };

  try {
    if (id) {
      await masterPrisma.m_menu.update({
        where: { id },
        data: {
          label: input.label.trim(),
          path: input.path.trim(),
          icon: input.icon.trim() || "LayoutGrid",
          parentKey: input.parentKey,
          groupKey: input.groupKey,
          section: input.section,
          sortOrder: input.sortOrder,
          badge: input.badge || null,
          isActive: input.isActive,
          updatedBy: session.userId,
        },
      });
      revalidatePath("/access/menus");
      return { success: true, id };
    }
    const key =
      (input.key || input.label)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/(^_|_$)/g, "") || `menu_${Date.now().toString(36)}`;
    const clash = await masterPrisma.m_menu.findUnique({ where: { key } });
    if (clash) return { success: false, error: "Key menu sudah dipakai." };
    const created = await masterPrisma.m_menu.create({
      data: {
        key,
        label: input.label.trim(),
        path: input.path.trim(),
        icon: input.icon.trim() || "LayoutGrid",
        parentKey: input.parentKey,
        groupKey: input.groupKey,
        section: input.section,
        sortOrder: input.sortOrder,
        badge: input.badge || null,
        isActive: input.isActive,
        createdBy: session.userId,
      },
    });
    revalidatePath("/access/menus");
    return { success: true, id: created.id };
  } catch (err) {
    console.error("[upsertMenuAction] error:", err);
    return { success: false, error: "Gagal menyimpan menu." };
  }
}

export async function deleteMenuAction(id: string): Promise<{ success: boolean }> {
  const session = await requireSession();
  if (!session) return { success: false };
  await masterPrisma.m_menu.update({
    where: { id },
    data: { isDeleted: 1, deletedAt: new Date(), deletedBy: session.userId },
  });
  revalidatePath("/access/menus");
  return { success: true };
}

/* ════════════════════════════════════════════════════════
 *  ROLE ↔ MENU MATRIX
 * ════════════════════════════════════════════════════════ */

export async function getRoleMenuPermissionsAction(
  roleId: string,
): Promise<RoleMenuPermission[]> {
  const session = await requireSession();
  if (!session) return [];
  const rows = await masterPrisma.m_role_menu.findMany({
    where: { roleId, ...NOT_DELETED },
    include: { menu: { select: { key: true } } },
  });
  return rows.map((r) => ({
    menuId: r.menuId,
    menuKey: r.menu?.key ?? "",
    canView: r.canView,
    canCreate: r.canCreate,
    canUpdate: r.canUpdate,
    canDelete: r.canDelete,
    canCancel: r.canCancel,
    canImport: r.canImport,
    canExport: r.canExport,
  }));
}

export type RoleMenuMatrixInput = {
  menuId: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canCancel: boolean;
  canImport: boolean;
  canExport: boolean;
};

/** Replace the whole role→menu matrix for a role (rows with any flag set). */
export async function saveRoleMenuPermissionsAction(
  roleId: string,
  rows: RoleMenuMatrixInput[],
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();
  if (!session) return { success: false, error: "Not authenticated." };
  try {
    await masterPrisma.m_role_menu.deleteMany({ where: { roleId } });
    const keep = rows.filter(
      (r) =>
        r.canView ||
        r.canCreate ||
        r.canUpdate ||
        r.canDelete ||
        r.canCancel ||
        r.canImport ||
        r.canExport,
    );
    if (keep.length > 0) {
      await masterPrisma.m_role_menu.createMany({
        data: keep.map((r) => ({
          roleId,
          menuId: r.menuId,
          canView: r.canView,
          canCreate: r.canCreate,
          canUpdate: r.canUpdate,
          canDelete: r.canDelete,
          canCancel: r.canCancel,
          canImport: r.canImport,
          canExport: r.canExport,
          createdBy: session.userId,
        })),
      });
    }
    revalidatePath("/access/roles");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[saveRoleMenuPermissionsAction] error:", err);
    return { success: false, error: "Gagal menyimpan permission." };
  }
}

/* ════════════════════════════════════════════════════════
 *  EFFECTIVE ACCESS for the current session (sidebar + gating)
 * ════════════════════════════════════════════════════════ */

export type EffectiveMenu = MenuRecord & MenuActions;

export type EffectiveAccess = {
  roleKey: string;
  /** super roles (level <= 1) get full access to everything */
  isSuper: boolean;
  /** ALL active menus with the role's resolved action flags (not pre-filtered).
   * The sidebar filters to canView; route/action gating reads the flags. */
  menus: EffectiveMenu[];
};

/**
 * Resolve every active menu + the current role's per-menu action grants. Super
 * roles (level ≤ 1: superadmin/owner) implicitly get all actions on all menus.
 * Returns ALL active menus (canView may be false) so the caller can both render
 * the sidebar (filter canView) and hard-gate routes/actions by the flags.
 */
export async function getEffectiveAccessAction(): Promise<EffectiveAccess> {
  const session = await requireSession();
  if (!session) return { roleKey: "", isSuper: false, menus: [] };

  const role = await masterPrisma.m_role.findUnique({ where: { key: session.role } });
  const isSuper = (role?.level ?? 5) <= 1;

  const menus = await masterPrisma.m_menu.findMany({
    where: { isActive: true, ...NOT_DELETED },
    orderBy: { sortOrder: "asc" },
  });

  const base = (m: (typeof menus)[number]): MenuRecord => ({
    id: m.id,
    key: m.key,
    label: m.label,
    path: m.path,
    icon: m.icon,
    parentKey: m.parentKey,
    groupKey: m.groupKey,
    section: m.section,
    sortOrder: m.sortOrder,
    badge: m.badge,
    isActive: m.isActive,
  });

  if (isSuper) {
    return {
      roleKey: session.role,
      isSuper: true,
      menus: menus.map((m) => ({
        ...base(m),
        canView: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canCancel: true,
        canImport: true,
        canExport: true,
      })),
    };
  }

  if (!role) return { roleKey: session.role, isSuper: false, menus: [] };

  const perms = await masterPrisma.m_role_menu.findMany({
    where: { roleId: role.id, ...NOT_DELETED },
  });
  const permByMenu = new Map(perms.map((p) => [p.menuId, p]));

  const effective: EffectiveMenu[] = menus.map((m) => {
    const p = permByMenu.get(m.id);
    return {
      ...base(m),
      canView: p?.canView ?? false,
      canCreate: p?.canCreate ?? false,
      canUpdate: p?.canUpdate ?? false,
      canDelete: p?.canDelete ?? false,
      canCancel: p?.canCancel ?? false,
      canImport: p?.canImport ?? false,
      canExport: p?.canExport ?? false,
    };
  });

  return { roleKey: session.role, isSuper: false, menus: effective };
}
