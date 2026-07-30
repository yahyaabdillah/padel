// TENANT (per-club) Prisma client resolver — with per-connection caching.
// In custom mode the active tenant's DB credentials come from the master
// m_tenant registry (resolved at login and carried in the session cookie).
import { PrismaClient } from "@prisma/tenant-client";

export interface TenantDbConfig {
  host: string;
  port?: number;
  name: string;
  username: string;
  password: string;
}

type CacheEntry = { client: PrismaClient; lastUsedAt: number; label: string };

const globalForTenant = global as unknown as {
  tenantClients?: Record<string, CacheEntry>;
};
if (!globalForTenant.tenantClients) globalForTenant.tenantClients = {};
const clients = globalForTenant.tenantClients;

const DEBUG = process.env.TENANT_DB_DEBUG === "true";
const debug = (...a: unknown[]) => DEBUG && console.log("[TenantDB]", ...a);

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw.trim());
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function cacheMax() {
  return num("PRISMA_TENANT_CLIENT_CACHE_MAX", 10);
}

function applyPoolParams(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    if (!u.searchParams.has("connection_limit"))
      u.searchParams.set(
        "connection_limit",
        String(num("PRISMA_TENANT_CONNECTION_LIMIT", num("PRISMA_CONNECTION_LIMIT", 2))),
      );
    if (!u.searchParams.has("pool_timeout"))
      u.searchParams.set(
        "pool_timeout",
        String(num("PRISMA_TENANT_POOL_TIMEOUT", num("PRISMA_POOL_TIMEOUT", 20))),
      );
    if (!u.searchParams.has("connect_timeout"))
      u.searchParams.set(
        "connect_timeout",
        String(num("PRISMA_TENANT_CONNECT_TIMEOUT", num("PRISMA_CONNECT_TIMEOUT", 10))),
      );
    return u.toString();
  } catch {
    return rawUrl;
  }
}

function remember(key: string, client: PrismaClient, label: string) {
  clients[key] = { client, label, lastUsedAt: Date.now() };
}

function getCached(key: string): PrismaClient | null {
  const e = clients[key];
  if (!e) return null;
  e.lastUsedAt = Date.now();
  return e.client;
}

async function evictIfNeeded() {
  const max = cacheMax();
  const entries = Object.entries(clients);
  if (entries.length <= max) return;
  const victims = entries
    .filter(([k]) => k !== "default")
    .sort(([, a], [, b]) => a.lastUsedAt - b.lastUsedAt)
    .slice(0, Math.max(0, entries.length - max));
  await Promise.all(
    victims.map(async ([k, e]) => {
      try {
        await e.client.$disconnect();
      } catch (err) {
        console.warn("[TenantDB] disconnect failed for", e.label, err);
      } finally {
        delete clients[k];
      }
    }),
  );
}

function buildUrl(cfg: TenantDbConfig): string {
  const port = cfg.port ?? 5432;
  const pw = encodeURIComponent(cfg.password);
  return applyPoolParams(
    `postgresql://${cfg.username}:${pw}@${cfg.host}:${port}/${cfg.name}?schema=public`,
  );
}

/**
 * Resolve a tenant Prisma client.
 * - With an explicit config: connect to that tenant DB (cached by connection string).
 * - Without a config: fall back to the default TENANT_DATABASE_URL.
 */
export async function getTenantDb(cfg?: TenantDbConfig): Promise<PrismaClient> {
  if (!cfg) {
    const cached = getCached("default");
    if (cached) return cached;
    const fallback = process.env.TENANT_DATABASE_URL;
    debug("No config — using default TENANT_DATABASE_URL");
    const client = fallback
      ? new PrismaClient({ datasources: { db: { url: applyPoolParams(fallback) } } })
      : new PrismaClient();
    remember("default", client, "default");
    await evictIfNeeded();
    return client;
  }

  const url = buildUrl(cfg);
  const cached = getCached(url);
  if (cached) return cached;

  debug(`Connecting tenant DB ${cfg.name} @ ${cfg.host}`);
  const client = new PrismaClient({ datasources: { db: { url } } });
  remember(url, client, cfg.name);
  await evictIfNeeded();
  return client;
}
