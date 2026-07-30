import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthSession } from "./auth-types";

const MIN_SECRET_LENGTH = 32;

type SessionPayload = Omit<AuthSession, "dbConfig"> & {
  issuedAt?: number;
  expiresAt?: number;
};

function assertSecret(secret: string): void {
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);
  }
}

function signatureFor(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function signSessionToken(
  session: AuthSession,
  secret: string,
  maxAgeSeconds?: number,
): string {
  assertSecret(secret);
  const safeSession = { ...session };
  delete safeSession.dbConfig;
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = maxAgeSeconds
    ? {
        ...safeSession,
        issuedAt: now,
        expiresAt: now + maxAgeSeconds,
      }
    : safeSession;
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signatureFor(encoded, secret).toString("base64url");
  return `${encoded}.${signature}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
): AuthSession | null {
  try {
    assertSecret(secret);
    const [encoded, signature, extra] = token.split(".");
    if (!encoded || !signature || extra) return null;

    const expected = signatureFor(encoded, secret);
    const actual = Buffer.from(signature, "base64url");
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (
      !payload.companyId ||
      !payload.userId ||
      !payload.role ||
      !payload.id ||
      (payload.expiresAt !== undefined &&
        payload.expiresAt <= Math.floor(Date.now() / 1000))
    ) {
      return null;
    }

    const session = { ...payload };
    delete session.issuedAt;
    delete session.expiresAt;
    return session;
  } catch {
    return null;
  }
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) {
    assertSecret(secret);
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return "padelhub-development-session-secret-change-me";
}
