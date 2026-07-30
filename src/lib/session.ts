import { cookies } from "next/headers";
import { resolveTenantConfig } from "./auth";
import type { AuthSession } from "./auth-types";
import { SESSION_COOKIE_NAME } from "./env";
import { getSessionSecret, verifySessionToken } from "./session-token";

/** Verify the signed cookie and rehydrate tenant credentials server-side. */
export async function readVerifiedSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const session = verifySessionToken(raw, getSessionSecret());
  if (!session) return null;

  const dbConfig = await resolveTenantConfig(session.companyId);
  if (!dbConfig) return null;
  return { ...session, dbConfig };
}
