// PadelHub — server-side permission enforcement (master DB backed).
// The single place that resolves a session's per-menu action grants and that
// mutation server actions call to HARD-ENFORCE RBAC (UI gating alone is not
// security). Superadmin bypasses; every other role is governed by m_role_menu.

import { cookies } from "next/headers";
import { masterPrisma } from "@/lib/master-db";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";

export type AccessAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "cancel"
  | "import"
  | "export";

const ACTION_COLUMN: Record<AccessAction, keyof RoleMenuFlags> = {
  view: "canView",
  create: "canCreate",
  update: "canUpdate",
  delete: "canDelete",
  cancel: "canCancel",
  import: "canImport",
  export: "canExport",
};

export type RoleMenuFlags = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canCancel: boolean;
  canImport: boolean;
  canExport: boolean;
};

/** Read the current session from the cookie (server). */
export async function readSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

/** Is this role the platform Super Admin (full bypass)? */
export function isSuperRole(roleKey: string | undefined): boolean {
  return roleKey === "superadmin";
}

/**
 * Resolve a role's flags for a single menu key, then apply any per-user
 * override (m_user_menu in the tenant DB) on top. Returns all-false when the
 * role has no grant and there's no override. Superadmin is handled by the
 * caller (bypass).
 */
async function resolveFlags(
  session: AuthSession,
  menuKey: string,
): Promise<RoleMenuFlags> {
  const off: RoleMenuFlags = {
    canView: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canCancel: false,
    canImport: false,
    canExport: false,
  };

  const role = await masterPrisma.m_role.findUnique({ where: { key: session.role } });
  const menu = await masterPrisma.m_menu.findUnique({ where: { key: menuKey } });
  if (!menu) return off;

  let flags = off;
  if (role) {
    const rm = await masterPrisma.m_role_menu.findUnique({
      where: { roleId_menuId: { roleId: role.id, menuId: menu.id } },
    });
    if (rm && rm.isDeleted === 0) {
      flags = {
        canView: rm.canView,
        canCreate: rm.canCreate,
        canUpdate: rm.canUpdate,
        canDelete: rm.canDelete,
        canCancel: rm.canCancel,
        canImport: rm.canImport,
        canExport: rm.canExport,
      };
    }
  }

  // Per-user override (tenant DB) REPLACES the role grant for this menu.
  // Only internal users have a UUID m_user id we can key on.
  if (isUuid(session.id)) {
    try {
      const db = await getTenantDb(session.dbConfig);
      const override = await db.m_user_menu.findUnique({
        where: { userId_menuKey: { userId: session.id, menuKey } },
      });
      if (override && override.isDeleted === 0) {
        flags = {
          canView: override.canView,
          canCreate: override.canCreate,
          canUpdate: override.canUpdate,
          canDelete: override.canDelete,
          canCancel: override.canCancel,
          canImport: override.canImport,
          canExport: override.canExport,
        };
      }
    } catch {
      /* override is best-effort; fall back to role flags */
    }
  }

  return flags;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v: string | undefined): boolean {
  return !!v && UUID_RE.test(v);
}

export type GuardResult =
  | { ok: true; session: AuthSession }
  | { ok: false; error: string };

/**
 * Enforce that the current session may perform `action` on `menuKey`.
 * Use at the top of every mutation server action:
 *
 *   const guard = await requirePermission("master.courts", "create");
 *   if (!guard.ok) return { success: false, error: guard.error };
 *   const session = guard.session;
 */
export async function requirePermission(
  menuKey: string,
  action: AccessAction,
): Promise<GuardResult> {
  const session = await readSession();
  if (!session) return { ok: false, error: "Tidak terautentikasi." };

  // Super Admin bypasses the matrix entirely.
  if (isSuperRole(session.role)) return { ok: true, session };

  const flags = await resolveFlags(session, menuKey);
  if (flags[ACTION_COLUMN[action]]) return { ok: true, session };

  return {
    ok: false,
    error: "Anda tidak memiliki izin untuk tindakan ini.",
  };
}

/** Like requirePermission but only needs a valid session (no action check). */
export async function requireAuth(): Promise<GuardResult> {
  const session = await readSession();
  if (!session) return { ok: false, error: "Tidak terautentikasi." };
  return { ok: true, session };
}

/**
 * Server-component view guard. Returns true if the current session may VIEW the
 * page owned by `menuKey`. Use at the top of a gated page's Server Component to
 * block READ access BEFORE any data is fetched or HTML is streamed:
 *
 *   if (!(await canViewMenu("master.courts"))) return <AccessDenied />;
 *
 * Returns false when unauthenticated (the middleware already redirects those,
 * but this is defense-in-depth).
 */
export async function canViewMenu(menuKey: string): Promise<boolean> {
  const session = await readSession();
  if (!session) return false;
  if (isSuperRole(session.role)) return true;
  const flags = await resolveFlags(session, menuKey);
  return flags.canView;
}
