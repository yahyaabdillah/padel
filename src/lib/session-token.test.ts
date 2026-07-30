import assert from "node:assert/strict";
import test from "node:test";
import type { AuthSession } from "./auth-types";
import { signSessionToken, verifySessionToken } from "./session-token";

const session: AuthSession = {
  companyId: "club-a",
  userId: "owner",
  role: "owner",
  displayName: "Club Owner",
  id: "11111111-1111-4111-8111-111111111111",
  level: 2,
  version: "v1",
};

test("signed session round-trips without exposing database credentials", () => {
  const token = signSessionToken(session, "test-secret-at-least-32-characters");
  assert.deepEqual(
    verifySessionToken(token, "test-secret-at-least-32-characters"),
    session,
  );
  assert.doesNotMatch(token, /password|dbConfig/);
});

test("tampered session token is rejected", () => {
  const token = signSessionToken(session, "test-secret-at-least-32-characters");
  const [payload, signature] = token.split(".");
  const decoded = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as AuthSession;
  const forgedPayload = Buffer.from(
    JSON.stringify({ ...decoded, role: "superadmin" }),
  ).toString("base64url");

  assert.equal(
    verifySessionToken(
      `${forgedPayload}.${signature}`,
      "test-secret-at-least-32-characters",
    ),
    null,
  );
});

test("session token signed with another secret is rejected", () => {
  const token = signSessionToken(session, "test-secret-at-least-32-characters");
  assert.equal(
    verifySessionToken(token, "different-secret-at-least-32-chars"),
    null,
  );
});
