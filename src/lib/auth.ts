// Core auth helpers (server-only).
import * as bcrypt from "bcryptjs";
import { masterPrisma } from "./master-db";
import { getTenantDb, type TenantDbConfig } from "./tenant-db";
import { getCustomTenantCompanyId } from "./env";
import {
  type AuthSession,
  type UserRole,
  normalizeRole,
  getRoleDashboardPath,
} from "./auth-types";

export type { UserRole, AuthSession };
export { getRoleDashboardPath };

/** Active app version label (parity with sevenrent). Defaults to "v1". */
export async function getActiveVersion(): Promise<string> {
  try {
    const v = await masterPrisma.m_version.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return v?.versionName || "v1";
  } catch {
    return "v1";
  }
}

/** Resolve a tenant's DB connection config from the master registry. */
export async function resolveTenantConfig(
  companyId: string,
): Promise<TenantDbConfig | null> {
  const tenant = await masterPrisma.m_tenant.findUnique({
    where: { companyId: companyId.trim().toLowerCase() },
  });
  if (!tenant || tenant.status === "suspended") return null;
  return {
    host: tenant.dbHost,
    port: tenant.dbPort,
    name: tenant.dbName,
    username: tenant.dbUsername,
    password: tenant.dbPassword,
  };
}

/** Map a role key to its authority level (1 = highest). */
async function resolveRoleLevel(roleKey: UserRole): Promise<number> {
  const role = await masterPrisma.m_role.findUnique({ where: { key: roleKey } });
  return role?.level ?? 5;
}

/**
 * Authenticate a user in CUSTOM mode: username + password against the tenant DB.
 * Returns a populated AuthSession on success, or null on any failure.
 */
export async function authenticateCustom(
  userId: string,
  password: string,
  companyId?: string,
): Promise<AuthSession | null> {
  const company = (companyId || getCustomTenantCompanyId()).trim().toLowerCase();

  const cfg = await resolveTenantConfig(company);
  if (!cfg) return null;

  const tenantDb = await getTenantDb(cfg);
  const user = await tenantDb.m_user.findFirst({
    where: {
      companyId: company,
      userId: userId.trim().toLowerCase(),
      isActive: true,
      isDeleted: 0,
    },
  });

  // ── No internal user? Try the member portal (separate m_member table). ──
  if (!user) {
    const member = await tenantDb.m_member.findFirst({
      where: {
        companyId: company,
        username: userId.trim().toLowerCase(),
        status: "active",
        isDeleted: 0,
      },
    });
    if (!member || !member.passwordHash) return null;
    const memberOk = await bcrypt.compare(password, member.passwordHash);
    if (!memberOk) return null;

    const memberLevel = await resolveRoleLevel("member");
    const memberVersion = await getActiveVersion();
    try {
      await tenantDb.m_member.update({
        where: { id: member.id },
        data: { lastLogin: new Date() },
      });
    } catch {
      /* ignore */
    }
    return {
      companyId: company,
      userId: member.username,
      role: "member",
      displayName: member.name || member.username,
      id: member.id,
      email: member.email || undefined,
      photo: member.avatar || undefined,
      level: memberLevel,
      version: memberVersion,
      dbConfig: cfg,
    };
  }

  if (!user.passwordHash) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  const role = normalizeRole(user.roleKey);
  if (!role) return null;

  const level = await resolveRoleLevel(role);
  const version = await getActiveVersion();

  // Best-effort last-login stamp; never block auth on failure.
  try {
    await tenantDb.m_user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
  } catch {
    /* ignore */
  }

  return {
    companyId: company,
    userId: user.userId,
    role,
    displayName: user.namalengkap || user.userId,
    id: user.id,
    email: user.email || undefined,
    photo: user.photo || undefined,
    level,
    version,
    dbConfig: cfg,
  };
}
