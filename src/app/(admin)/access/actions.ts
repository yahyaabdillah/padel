"use server";

// PadelHub — Access Control server actions (master DB backed).
// Manages roles, the menu catalog, and the per-(role, menu) action matrix
// (view/create/update/delete/import/export). Also resolves the effective
// menu + action grants for the current session's role so the sidebar and
// page actions can be gated dynamically.

import { revalidatePath } from "next/cache";
import { masterPrisma } from "@/lib/master-db";
import { getTenantDb } from "@/lib/tenant-db";
import { readSession, requirePermission } from "@/lib/access-guard";

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
  const session = await readSession();
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
  const guard = await requirePermission("access.roles", id ? "update" : "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
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
  const guard = await requirePermission("access.roles", "delete");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const role = await masterPrisma.m_role.findUnique({ where: { id } });
  if (!role) return { success: false, error: "Role tidak ditemukan." };
  if (role.key === "superadmin") {
    return { success: false, error: "Role Super Admin tidak bisa dihapus." };
  }

  // block deleting a role that still has internal users assigned to it
  try {
    const db = await getTenantDb();
    const inUse = await db.m_user.count({
      where: { companyId: session.companyId, roleKey: role.key, isDeleted: 0 },
    });
    if (inUse > 0) {
      return {
        success: false,
        error: `Role masih dipakai ${inUse} user. Pindahkan user dulu sebelum menghapus.`,
      };
    }
  } catch {
    /* if tenant lookup fails, fall through and allow delete */
  }

  await masterPrisma.m_role.update({
    where: { id },
    data: { isDeleted: 1, deletedAt: new Date(), deletedBy: session.userId },
  });
  // also clear its menu grants
  await masterPrisma.m_role_menu.deleteMany({ where: { roleId: id } });
  revalidatePath("/access/roles");
  return { success: true };
}

/* ════════════════════════════════════════════════════════
 *  MENUS (catalog)
 * ════════════════════════════════════════════════════════ */

export async function getMenusAction(): Promise<MenuRecord[]> {
  const session = await readSession();
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
  const guard = await requirePermission("access.menus", id ? "update" : "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
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

export async function deleteMenuAction(id: string): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("access.menus", "delete");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  await masterPrisma.m_menu.update({
    where: { id },
    data: { isDeleted: 1, deletedAt: new Date(), deletedBy: session.userId },
  });
  revalidatePath("/access/menus");
  return { success: true };
}

/** Move a menu up/down within its sibling group by swapping sortOrder. */
export async function reorderMenuAction(
  id: string,
  direction: "up" | "down",
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("access.menus", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;

  const current = await masterPrisma.m_menu.findUnique({ where: { id } });
  if (!current || current.isDeleted !== 0) {
    return { success: false, error: "Menu tidak ditemukan." };
  }

  // siblings = same parentKey, ordered
  const siblings = await masterPrisma.m_menu.findMany({
    where: { parentKey: current.parentKey, isDeleted: 0 },
    orderBy: { sortOrder: "asc" },
  });
  const idx = siblings.findIndex((s) => s.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) {
    return { success: true }; // already at the edge, no-op
  }
  const other = siblings[swapIdx];

  // swap sortOrder values
  await masterPrisma.$transaction([
    masterPrisma.m_menu.update({
      where: { id: current.id },
      data: { sortOrder: other.sortOrder, updatedBy: session.userId },
    }),
    masterPrisma.m_menu.update({
      where: { id: other.id },
      data: { sortOrder: current.sortOrder, updatedBy: session.userId },
    }),
  ]);

  revalidatePath("/access/menus");
  revalidatePath("/", "layout");
  return { success: true };
}

/* ════════════════════════════════════════════════════════
 *  ROLE ↔ MENU MATRIX
 * ════════════════════════════════════════════════════════ */

export async function getRoleMenuPermissionsAction(
  roleId: string,
): Promise<RoleMenuPermission[]> {
  const session = await readSession();
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
  const guard = await requirePermission("access.roles", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
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
  /** the Super Admin bypasses the matrix and gets full access to everything */
  isSuper: boolean;
  /** ALL active menus with the role's resolved action flags (not pre-filtered).
   * The sidebar filters to canView; route/action gating reads the flags. */
  menus: EffectiveMenu[];
};

/**
 * Resolve every active menu + the current role's per-menu action grants. Only
 * the Super Admin bypasses the matrix (full access). Every other role — Owner
 * included — is governed by its m_role_menu grants. Returns ALL active menus
 * (canView may be false) so the caller can both render the sidebar (filter
 * canView) and hard-gate routes/actions by the flags.
 */
export async function getEffectiveAccessAction(): Promise<EffectiveAccess> {
  const session = await readSession();
  if (!session) return { roleKey: "", isSuper: false, menus: [] };

  const role = await masterPrisma.m_role.findUnique({ where: { key: session.role } });
  // Only the platform Super Admin bypasses the matrix. Every other role —
  // including Owner — is governed by its m_role_menu grants.
  const isSuper = session.role === "superadmin";

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

  // Per-user overrides (tenant DB) keyed by menu KEY — replace the role grant.
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const overrideByKey = new Map<string, MenuActions>();
  if (session.id && uuidRe.test(session.id)) {
    try {
      const db = await getTenantDb();
      const overrides = await db.m_user_menu.findMany({
        where: { companyId: session.companyId, userId: session.id, isDeleted: 0 },
      });
      for (const o of overrides) {
        overrideByKey.set(o.menuKey, {
          canView: o.canView,
          canCreate: o.canCreate,
          canUpdate: o.canUpdate,
          canDelete: o.canDelete,
          canCancel: o.canCancel,
          canImport: o.canImport,
          canExport: o.canExport,
        });
      }
    } catch {
      /* best-effort */
    }
  }

  const effective: EffectiveMenu[] = menus.map((m) => {
    const override = overrideByKey.get(m.key);
    if (override) {
      return { ...base(m), ...override };
    }
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
