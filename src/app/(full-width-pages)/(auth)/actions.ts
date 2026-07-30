"use server";

import { cookies } from "next/headers";
import {
  authenticateCustom,
  resolveTenantConfig,
  type AuthSession,
} from "@/lib/auth";
import { getAppMode, SESSION_COOKIE_NAME, getCustomTenantCompanyId } from "@/lib/env";
import type { TenantDbConfig } from "@/lib/tenant-db";
import { getSessionSecret, signSessionToken, verifySessionToken } from "@/lib/session-token";

/**
 * Cookie session — plain JSON (httpOnly). The tenant DB password is intentionally
 * NOT stored here; tenant connection config is re-resolved from the master
 * registry server-side via companyId whenever a tenant query is needed.
 */
type CookieSession = Omit<AuthSession, "dbConfig">;

function toCookieSession(s: AuthSession): CookieSession {
  const { dbConfig, ...rest } = s;
  void dbConfig;
  return rest;
}

async function writeSessionCookie(session: CookieSession) {
  const cookieStore = await cookies();
  const maxAge = 60 * 60 * 24 * 7;
  cookieStore.set(
    SESSION_COOKIE_NAME,
    signSessionToken(session, getSessionSecret(), maxAge),
    {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
    },
  );
}

export interface LoginResult {
  success: boolean;
  error?: string;
  role?: string;
  redirectTo?: string;
}

/**
 * CUSTOM-mode login: username + password against the active tenant.
 * PRODUCT-mode is not wired in this session.
 */
export async function loginAction(
  userId: string,
  password: string,
): Promise<LoginResult> {
  try {
    const mode = getAppMode();
    if (mode !== "custom") {
      return { success: false, error: "Product-mode login is not available yet." };
    }

    if (!userId?.trim() || !password) {
      return { success: false, error: "Username and password are required." };
    }

    const session = await authenticateCustom(userId, password);
    if (!session) {
      return { success: false, error: "Invalid username or password." };
    }

    await writeSessionCookie(toCookieSession(session));

    const { getRoleDashboardPath } = await import("@/lib/auth-types");
    return {
      success: true,
      role: session.role,
      redirectTo: getRoleDashboardPath(session.role),
    };
  } catch (err) {
    console.error("[loginAction] error:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** Read the current session (without tenant dbConfig). */
export async function getSessionAction(): Promise<CookieSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie) return null;
  return verifySessionToken(cookie.value, getSessionSecret());
}

/**
 * Resolve the tenant DB config for the current session's company, server-side.
 * Use this in server actions/route handlers that need to query tenant data.
 */
export async function getSessionTenantConfig(): Promise<TenantDbConfig | null> {
  const session = await getSessionAction();
  const company = session?.companyId || getCustomTenantCompanyId();
  return resolveTenantConfig(company);
}
