// MASTER (engine) Prisma client — singleton.
// Owns roles, permissions, menu/RBAC, version and the tenant registry.
import { PrismaClient } from "@prisma/master-client";

const globalForMaster = global as unknown as { masterPrisma?: PrismaClient };

function resolveMasterDbUrl(): string | undefined {
  const rawUrl = process.env.MASTER_DATABASE_URL;
  if (!rawUrl) return undefined;

  try {
    const parsed = new URL(rawUrl);

    const num = (name: string, fallback: string) => {
      const raw = process.env[name];
      if (!raw) return fallback;
      const n = Number(raw.trim());
      return Number.isFinite(n) && n > 0 ? String(Math.floor(n)) : fallback;
    };

    if (!parsed.searchParams.has("connection_limit"))
      parsed.searchParams.set("connection_limit", num("PRISMA_CONNECTION_LIMIT", "3"));
    if (!parsed.searchParams.has("pool_timeout"))
      parsed.searchParams.set("pool_timeout", num("PRISMA_POOL_TIMEOUT", "20"));
    if (!parsed.searchParams.has("connect_timeout"))
      parsed.searchParams.set("connect_timeout", num("PRISMA_CONNECT_TIMEOUT", "10"));

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function createClient() {
  const url = resolveMasterDbUrl();
  return url
    ? new PrismaClient({ datasources: { db: { url } } })
    : new PrismaClient();
}

export const masterPrisma = globalForMaster.masterPrisma ?? createClient();
globalForMaster.masterPrisma = masterPrisma;
