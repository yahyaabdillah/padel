// Centralized app-mode + environment resolution.
// MODE=custom  -> standalone, login by username + password (current focus)
// MODE=product -> SaaS, membership/license flow (future)

export type AppMode = "custom" | "product";

export function getAppMode(): AppMode {
  const raw = (process.env.MODE || "custom").trim().toLowerCase();
  return raw === "product" ? "product" : "custom";
}

export const isCustomMode = () => getAppMode() === "custom";
export const isProductMode = () => getAppMode() === "product";

/** The single active tenant companyId in custom mode. */
export function getCustomTenantCompanyId(): string {
  return (process.env.CUSTOM_TENANT_COMPANY_ID || "smashcourt").trim().toLowerCase();
}

export const SESSION_COOKIE_NAME = "padelhub_session";

/** HMAC secret for signing booking check-in QR tokens (with safe fallback). */
export function getCheckinTokenSecret(): string {
  return (process.env.CHECKIN_TOKEN_SECRET || "padelhub-checkin-fallback-secret-v1").trim();
}
