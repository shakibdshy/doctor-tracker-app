import { SESSION_IDLE_SECONDS, createAuth } from "@doctor-tracker-app/auth";
import { closeDb, createDb } from "@doctor-tracker-app/db";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * The sliding idle session (ADR-0004): expiry must be ~15 minutes at
 * sign-in, slide back to ~15 minutes on use past the refresh throttle,
 * and lapse cleanly when idle past the window. Cookie reissue on refresh
 * is verified against the installed better-auth source (setSessionCookie
 * with maxAge = expiresIn) and asserted here only via the DB record.
 */
const AUTH_ENV = {
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-123",
  CORS_ORIGIN: "http://localhost:3001",
};

const WINDOW_MS = SESSION_IDLE_SECONDS * 1000;
const SLACK_MS = 5_000;

let mongod: MongoMemoryServer;

beforeEach(async () => {
  mongod = await MongoMemoryServer.create();
});

afterEach(async () => {
  await closeDb();
  await mongod.stop();
});

/**
 * Real provisioning path (mirrors bootstrap-users): user first, then a
 * hashed credential account. Sign-in returns both the raw token (for
 * DB-side session lookups — the adapter stores relation fields as BSON
 * ObjectIds, so userId is not string-queryable) and the signed cookie
 * pair (the session cookie is HMAC-signed; replaying the real Set-Cookie
 * pair is the exact browser path and the only one getSession accepts).
 */
async function signIn() {
  const database = await createDb({ DATABASE_URL: mongod.getUri("session-slide-test") });
  const auth = createAuth(AUTH_ENV, database);
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser(
    { email: "slide@hospital.test", name: "Slide", emailVerified: true, role: "admin" },
    { method: "email-password" },
  );
  if (!user) throw new Error("user creation failed");
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash("Slide#12345"),
  });
  const { response, headers } = await auth.api.signInEmail({
    body: { email: "slide@hospital.test", password: "Slide#12345" },
    returnHeaders: true,
  });
  const token = response?.token;
  const cookiePair = headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith("better-auth.session_token="))
    ?.split(";")[0];
  if (!token || !cookiePair) throw new Error("sign-in failed");
  const sessionDoc = await database.collection("session").findOne({ token });
  if (!sessionDoc) throw new Error("session creation failed");
  return { auth, database, token, cookiePair };
}

function cookieHeader(cookiePair: string) {
  return new Headers({ cookie: cookiePair });
}

describe("sliding idle session", () => {
  test("sign-in expires the session at ~15 minutes, not the 7-day default", async () => {
    const { database, token } = await signIn();
    const doc = await database.collection("session").findOne({ token });
    const remaining = doc!.expiresAt.getTime() - Date.now();
    expect(remaining).toBeGreaterThan(WINDOW_MS - SLACK_MS);
    expect(remaining).toBeLessThanOrEqual(WINDOW_MS);
  });

  test("a fetch past the refresh throttle slides expiry back to ~15 minutes", async () => {
    const { auth, database, token, cookiePair } = await signIn();
    // Simulate 10 idle minutes: expiresAt now+5min, updatedAt now-10min —
    // past `updateAge` (1 min), so the next getSession must refresh.
    const fiveMin = new Date(Date.now() + 5 * 60_000);
    const tenMinAgo = new Date(Date.now() - 10 * 60_000);
    await database.collection("session").updateOne(
      { token },
      { $set: { expiresAt: fiveMin, updatedAt: tenMinAgo } },
    );
    const session = await auth.api.getSession({ headers: cookieHeader(cookiePair) });
    expect(session).not.toBeNull();
    const remaining = session!.session.expiresAt.getTime() - Date.now();
    expect(remaining).toBeGreaterThan(WINDOW_MS - SLACK_MS);
    expect(remaining).toBeLessThanOrEqual(WINDOW_MS);
    // The DB record slid with the in-memory read (cookie reissue follows).
    const doc = await database.collection("session").findOne({ token });
    expect(doc!.expiresAt.getTime()).toBe(session!.session.expiresAt.getTime());
  });

  test("a session idle past the window is dead on next use", async () => {
    const { auth, database, token, cookiePair } = await signIn();
    await database.collection("session").updateOne(
      { token },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } },
    );
    const session = await auth.api.getSession({ headers: cookieHeader(cookiePair) });
    expect(session).toBeNull();
    // getSession cleans up expired sessions (deferSessionRefresh is off),
    // so the record is gone — a stolen cookie cannot be revived by anyone.
    const doc = await database.collection("session").findOne({ token });
    expect(doc).toBeNull();
  });
});
