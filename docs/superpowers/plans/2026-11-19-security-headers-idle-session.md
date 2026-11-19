# Security Headers + Idle Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship nonce-based CSP, frame/referrer/permissions headers on web and API, a 15-minute inactivity logout enforced at both ends, and an ADR + README Security section with grep-verifiable patient-data hygiene claims (issue #10, spec `docs/superpowers/specs/2026-11-19-security-headers-idle-session-design.md`).

**Architecture:** Shared constants in `packages/auth` feed better-auth's sliding session (server half) and the web idle guard (client half). Web headers split by mechanism: per-request nonce CSP in `src/proxy.ts`, static headers in `next.config.ts`. Express replaces bare `helmet()` with an explicit config.

**Tech Stack:** Next.js 16.4.6 (`proxy.ts`, `headers()`), better-auth 1.7.22 (session `expiresIn`/`updateAge`; refresh-on-access with cookie reissue verified in installed source), Express 5 + helmet 8, bun test + mongodb-memory-server.

## Global Constraints

- Package manager is **bun** (workspace root, `packageManager: bun@1.4.3`); run all commands from the repo root unless a step says otherwise.
- **No new dependencies** — helmet and better-auth are already installed.
- TypeScript strict everywhere; every task ends with `bun run check-types` green.
- Commit style follows the repo: `feat(auth): …`, `feat(server): …`, `feat(web): …`, `docs: …`.
- Code comments must match the codebase's existing voice: rationale-heavy, explains *why*, references specs/ADRs.
- The 15-minute idle window is **not** env-configurable — constants only (`SESSION_IDLE_SECONDS`), per spec.
- Dev environment is already provisioned (Atlas live, demo creds `admin@doctracker.dev` / `Admin#12345`); web on :3001, API on :3000.
- API surface of earlier tasks consumed later: `SESSION_IDLE_SECONDS`, `SESSION_REFRESH_SECONDS` exported from `@doctor-tracker-app/auth` (root index re-export); `securityHeaders` middleware from `apps/server/src/middleware/security.ts`.

---

### Task 1: Sliding idle session — shared constants + better-auth config + slide test

**Files:**
- Create: `packages/auth/src/session.ts`
- Modify: `packages/auth/src/index.ts` (add one export line)
- Modify: `packages/auth/src/index.ts` `createAuth` (add `session` block)
- Test: `apps/server/test/session.slide.test.ts`

**Interfaces:**
- Consumes: `createDb`/`closeDb` from `@doctor-tracker-app/db`; `createAuth(env, database)` existing signature.
- Produces: `SESSION_IDLE_SECONDS = 900`, `SESSION_REFRESH_SECONDS = 60` exported from `@doctor-tracker-app/auth` (Task 5 imports `SESSION_IDLE_SECONDS`). Test file `session.slide.test.ts` is the regression net for the 15-minute semantics.

- [ ] **Step 1: Create the shared constants file**

`packages/auth/src/session.ts`:

```ts
/**
 * Idle-session window shared by both ends of the portal: better-auth's
 * sliding session (createAuth) and the web idle guard arm the same 15
 * minutes, so client-side sign-out and server-side expiry cannot drift
 * apart (ADR-0004).
 */
export const SESSION_IDLE_SECONDS = 60 * 15;

/**
 * Minimum interval between server-side expiry refreshes (better-auth
 * `session.updateAge`): one minute of activity keeps the session warm
 * without a write on every request.
 */
export const SESSION_REFRESH_SECONDS = 60;
```

Add to `packages/auth/src/index.ts` — an import (so `createAuth` can use the constants locally) and a re-export (so web/server consume them from the package root):

```ts
import { SESSION_IDLE_SECONDS, SESSION_REFRESH_SECONDS } from "./session";

export { SESSION_IDLE_SECONDS, SESSION_REFRESH_SECONDS } from "./session";
```

- [ ] **Step 2: Write the failing test**

`apps/server/test/session.slide.test.ts`:

```ts
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

/** Session cookie path is idle-window-independent; asserted bounds below. */
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

/** Real provisioning path (mirrors bootstrap-users): user + credential. */
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
  await auth.api.signInEmail({ body: { email: "slide@hospital.test", password: "Slide#12345" } });
  const sessionDoc = await database.collection("session").findOne({ userId: user.id });
  if (!sessionDoc) throw new Error("session creation failed");
  return { auth, database, token: sessionDoc.token };
}

function cookieHeader(token: string) {
  return new Headers({ cookie: `better-auth.session_token=${token}` });
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
    const { auth, database, token } = await signIn();
    // Simulate 10 idle minutes: expiresAt now+5min, updatedAt now-10min —
    // past `updateAge` (1 min), so the next getSession must refresh.
    const fiveMin = new Date(Date.now() + 5 * 60_000);
    const tenMinAgo = new Date(Date.now() - 10 * 60_000);
    await database.collection("session").updateOne(
      { token },
      { $set: { expiresAt: fiveMin, updatedAt: tenMinAgo } },
    );
    const session = await auth.api.getSession({ headers: cookieHeader(token) });
    expect(session).not.toBeNull();
    const remaining = session!.session.expiresAt.getTime() - Date.now();
    expect(remaining).toBeGreaterThan(WINDOW_MS - SLACK_MS);
    expect(remaining).toBeLessThanOrEqual(WINDOW_MS);
    // The DB record slid with the in-memory read (cookie reissue follows).
    const doc = await database.collection("session").findOne({ token });
    expect(doc!.expiresAt.getTime()).toBe(session!.session.expiresAt.getTime());
  });

  test("a session idle past the window is dead on next use", async () => {
    const { auth, database, token } = await signIn();
    await database.collection("session").updateOne(
      { token },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } },
    );
    const session = await auth.api.getSession({ headers: cookieHeader(token) });
    expect(session).toBeNull();
    const doc = await database.collection("session").findOne({ token });
    expect(doc).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/server && bun test test/session.slide.test.ts`
Expected: **FAIL** — with the 7-day default, the first test's upper bound (`remaining ≤ 15 min`) is violated (expiry sits at ~7 days).

- [ ] **Step 4: Apply the sliding config in `createAuth`**

In `packages/auth/src/index.ts`, inside the `betterAuth({ ... })` options (after `rateLimit`), add:

```ts
    session: {
      // Sliding idle window (ADR-0004): better-auth refreshes on session
      // use when now - updatedAt >= updateAge, re-issuing the cookie with
      // a fresh maxAge — so a stolen cookie goes inert after 15 idle
      // minutes, while an active user never sees a re-prompt.
      expiresIn: SESSION_IDLE_SECONDS,
      updateAge: SESSION_REFRESH_SECONDS,
    },
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/server && bun test test/session.slide.test.ts`
Expected: **PASS** (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/auth/src/session.ts packages/auth/src/index.ts apps/server/test/session.slide.test.ts
git commit -m "feat(auth): 15-minute sliding idle session"
```

---

### Task 2: Explicit helmet config on the Express API

**Files:**
- Create: `apps/server/src/middleware/security.ts`
- Modify: `apps/server/src/index.ts` (replace `app.use(helmet())`)
- Test: `apps/server/test/security-headers.test.ts`

**Interfaces:**
- Consumes: helmet 8 (installed).
- Produces: `securityHeaders` — a helmet `RequestHandler` exported from `apps/server/src/middleware/security.ts`; `index.ts` mounts it where `helmet()` sat.

- [ ] **Step 1: Write the failing test**

`apps/server/test/security-headers.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import express from "express";

import { securityHeaders } from "../src/middleware/security";

/**
 * The API's header story (ADR-0004), asserted against a real response so
 * it cannot silently regress with a helmet upgrade: nothing renders
 * (CSP `default-src 'none'`, `frame-ancestors 'none'`), framing is
 * refused outright (XFO DENY), and no referrer ever leaves with a link.
 */
function buildApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("security headers", () => {
  test("API responses carry CSP, frame-deny and no-referrer", async () => {
    const server = buildApp().listen(0);
    try {
      const port = (server.address() as { port: number }).port;
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      const csp = res.headers.get("content-security-policy") ?? "";
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(res.headers.get("x-frame-options")).toBe("DENY");
      expect(res.headers.get("referrer-policy")).toBe("no-referrer");
      expect(res.headers.has("x-powered-by")).toBe(false);
    } finally {
      server.close();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/server && bun test test/security-headers.test.ts`
Expected: **FAIL** — `securityHeaders` does not exist yet (import error).

- [ ] **Step 3: Create the middleware and wire it in**

`apps/server/src/middleware/security.ts`:

```ts
import helmet from "helmet";

/**
 * Browser-facing headers on every API response — explicit rather than
 * helmet's defaults so the defence story is visible and testable: an API
 * renders nothing (CSP `default-src 'none'`, `frame-ancestors 'none'`),
 * refuses framing outright (XFO DENY), and sends no referrer. HSTS and
 * no-sniff keep helmet's defaults; the web app's headers live in Next
 * (next.config.ts + proxy.ts) — this is the API layer only.
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "no-referrer" },
});
```

In `apps/server/src/index.ts`:

- Remove the `import helmet from "helmet";` line.
- Add `import { securityHeaders } from "./middleware/security";` (grouped with the other local imports).
- Replace `app.use(helmet());` with `app.use(securityHeaders);`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/server && bun test test/security-headers.test.ts`
Expected: **PASS**.

- [ ] **Step 5: Run the full server suite (no regressions)**

Run: `cd apps/server && bun test`
Expected: all suites pass, including the new `session.slide.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/middleware/security.ts apps/server/src/index.ts apps/server/test/security-headers.test.ts
git commit -m "feat(server): explicit security headers on the API"
```

---

### Task 3: Static security headers on every web route

**Files:**
- Modify: `apps/web/next.config.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` (+ prod HSTS) on all page responses. CSP deliberately absent here — Task 4 owns it.

- [ ] **Step 1: Add `headers()` to `next.config.ts`**

Above `const nextConfig: NextConfig = {`, add:

```ts
const isProd = process.env.NODE_ENV === "production";

/**
 * Static security headers on every route (ADR-0004). CSP is intentionally
 * absent — it needs a per-request nonce and lives in src/proxy.ts; this is
 * the request-independent layer. `frame-ancestors 'none'` in the CSP makes
 * X-Frame-Options redundant in modern browsers, but it stays as the
 * legacy backstop. HSTS is a production concern — localhost dev must not
 * bake HTTPS upgrades into test browsers.
 */
function staticSecurityHeaders(): { key: string; value: string }[] {
  const headers = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "no-referrer" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
  ];
  if (isProd) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }
  return headers;
}
```

Inside `nextConfig`, add:

```ts
  async headers() {
    return [{ source: "/:path*", headers: staticSecurityHeaders() }];
  },
```

- [ ] **Step 2: Verify against a running server**

Run: `cd apps/web && bun run dev` (background), wait for ready, then:

```bash
curl -sI http://localhost:3001/login | grep -iE "x-frame-options|referrer-policy|permissions-policy|strict-transport"
```

Expected: `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`; **no** `Strict-Transport-Security` in dev. Kill the dev server afterwards.

- [ ] **Step 3: Typecheck and commit**

Run: `bun run check-types` — expected: green.

```bash
git add apps/web/next.config.ts
git commit -m "feat(web): static security headers on all routes"
```

---

### Task 4: Nonce-based CSP via `src/proxy.ts`

**Files:**
- Create: `apps/web/src/proxy.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: per-request `Content-Security-Policy` on all HTML/RSC responses; Next's renderer extracts the nonce from the CSP *request* header and stamps its inline bootstrap scripts (verified: `get-script-nonce-from-header.js` in installed Next 16.4.6).

- [ ] **Step 1: Create `apps/web/src/proxy.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";

const isProd = process.env.NODE_ENV === "production";

/**
 * Per-request nonce CSP (ADR-0004), the official Next.js pattern: the
 * policy is set on the *request* headers so the renderer extracts the
 * nonce and stamps it onto Next's inline bootstrap scripts, then the same
 * policy rides the response. 'strict-dynamic' lets nonce'd scripts load
 * the static chunks while any injected inline script without the nonce —
 * the XSS payload shape — is refused execution. Dev additionally allows
 * 'unsafe-eval' (React refresh) and the HMR websocket.
 *
 * style-src keeps 'unsafe-inline': Next injects inline styles, style
 * hashing is brittle across builds, and style-only injection cannot run
 * script. Accepted trade-off, documented in ADR-0004.
 *
 * /api/* is excluded: those responses are rewritten from Express, whose
 * helmet config owns their headers.
 */
function buildCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${isProd ? "" : " ws:"}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join("; ") + (isProd ? "; upgrade-insecure-requests" : "");
}

export default function proxy(request: NextRequest): NextResponse {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  // Everything that renders HTML; static assets and rewritten API traffic excluded.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Verify nonce rotation and policy shape in dev**

Start `cd apps/web && bun run dev` (background), then:

```bash
curl -sI http://localhost:3001/login | grep -i "content-security-policy"
curl -sI http://localhost:3001/login | grep -i "content-security-policy"
```

Expected: both responses carry a CSP containing `script-src 'self' 'nonce-<32 hex>' 'strict-dynamic' 'unsafe-eval'` and `frame-ancestors 'none'`; **the two nonces differ**. Also confirm no CSP header on `/api/auth/get-session` responses (excluded by the matcher).

- [ ] **Step 3: Browser smoke test (manual, honest)**

In the browser against the dev server: sign in as `admin@doctracker.dev`, visit Dashboard / Doctors / Patients / Team, apply a filter, open a dialog. Confirm the app renders and the console shows **no** `Refused to execute` / CSP violation reports. Charts must render (their inline `<style>` is covered by `style-src 'unsafe-inline'`).

- [ ] **Step 4: Production-shape verification**

Run `cd apps/web && bun run build`, then `bun run start` (background), then:

```bash
curl -sI http://localhost:3001/login | grep -i "content-security-policy"
```

Expected: CSP present with `strict-dynamic`, **without** `'unsafe-eval'` and **with** `upgrade-insecure-requests`. Kill the server. (If the build fails for a pre-existing environment reason unrelated to this change, record that fact and rely on the dev verification — do not "fix" unrelated build breakage in this task.)

- [ ] **Step 5: Typecheck and commit**

Run: `bun run check-types` — expected: green.

```bash
git add apps/web/src/proxy.ts
git commit -m "feat(web): nonce-based CSP via proxy"
```

---

### Task 5: Client idle guard — auto sign-out after 15 minutes

**Files:**
- Create: `apps/web/src/hooks/use-idle-session.ts`
- Create: `apps/web/src/shell/idle-session-guard.tsx`
- Modify: `apps/web/src/app/(app)/layout.tsx` (mount the guard)

**Interfaces:**
- Consumes: `SESSION_IDLE_SECONDS` from `@doctor-tracker-app/auth` (Task 1); `authClient` from `@/lib/auth-client`; `toast` from `sonner` (same import the features use).
- Produces: `useIdleSession()` hook; `IdleSessionGuard` (default export, renders null) mounted once in the authenticated shell.

*Planning-time verification (spec §3):* `lib/api.ts` has no global 401 handling — `apiFetch` throws `ApiError` and queries surface error states. That stays as-is: the idle guard owns the proactive UX, the RSC `requireSession()` guard owns deep links, and a server-expired session mid-tab is caught by the hook's visibilitycheck. No `api.ts` change.

- [ ] **Step 1: Create the hook**

`apps/web/src/hooks/use-idle-session.ts`:

```ts
"use client";

import { SESSION_IDLE_SECONDS } from "@doctor-tracker-app/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

const IDLE_MS = SESSION_IDLE_SECONDS * 1000;
// Coalesce input-event storms: re-arming once a minute is plenty.
const RESET_THROTTLE_MS = 60_000;

const ACTIVITY_EVENTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
] as const;

/**
 * Client half of the 15-minute idle logout (server half: better-auth's
 * sliding session — both windows come from SESSION_IDLE_SECONDS, ADR-0004).
 * No re-renders: activity lives in a ref, one timer armed at a time.
 * Background tabs throttle timers, so returning to a visibly-stale tab is
 * caught by the visibilitychange elapsed-time check instead of the timer.
 */
export function useIdleSession() {
  const router = useRouter();
  const lastActivityRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const signOut = async () => {
      clearTimer();
      toast.info("Signed out due to inactivity");
      try {
        await authClient.signOut();
      } catch {
        // The redirect is the safe outcome even if the network call fails;
        // the server session has its own idle window behind it.
      }
      if (!cancelled) router.replace("/login");
    };

    const arm = () => {
      clearTimer();
      const remaining = lastActivityRef.current + IDLE_MS - Date.now();
      timerRef.current = setTimeout(signOut, Math.max(remaining, 0));
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < RESET_THROTTLE_MS) return;
      lastActivityRef.current = now;
      arm();
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivityRef.current >= IDLE_MS) {
        void signOut();
        return;
      }
      arm();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
    arm();

    return () => {
      cancelled = true;
      clearTimer();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);
}
```

- [ ] **Step 2: Create the guard component**

`apps/web/src/shell/idle-session-guard.tsx`:

```tsx
"use client";

import { useIdleSession } from "@/hooks/use-idle-session";

/**
 * Arms the idle-session listeners for the authenticated shell. Renders
 * nothing — it exists so the server-component layout can mount the hook.
 */
export default function IdleSessionGuard() {
  useIdleSession();
  return null;
}
```

- [ ] **Step 3: Mount it in the authenticated layout**

In `apps/web/src/app/(app)/layout.tsx`, add the import and render it inside the root div (comment updated to mention it):

```tsx
import IdleSessionGuard from "@/shell/idle-session-guard";
```

```tsx
  return (
    <div className="flex h-svh">
      <IdleSessionGuard />
      <Sidebar />
```

- [ ] **Step 4: Manual verification with a temporary short window**

Temporarily edit `packages/auth/src/session.ts`: `export const SESSION_IDLE_SECONDS = 60 * 15;` → `= 15;`. Restart dev (web only is enough). Sign in, leave the page untouched: within ~15s the toast "Signed out due to inactivity" appears and the URL is `/login`. Sign in again, move the mouse steadily for >15s: no logout. Background the tab for >15s, return: immediate sign-out. Then **restore the constant to `60 * 15`** and restart dev.

- [ ] **Step 5: Typecheck and commit**

Run: `bun run check-types` — expected: green. Also `git diff` must show the constant restored.

```bash
git add apps/web/src/hooks/use-idle-session.ts apps/web/src/shell/idle-session-guard.tsx "apps/web/src/app/(app)/layout.tsx"
git commit -m "feat(web): idle-session guard — auto sign-out after 15 minutes"
```

---

### Task 6: ADR-0004 + README Security section

**Files:**
- Create: `docs/adr/0004-security-headers-and-idle-session.md`
- Modify: `README.md` (Highlights bullet, new Security section, test counts)

**Interfaces:**
- Consumes: everything built in Tasks 1–5 (the doc describes what exists).
- Produces: documentation only.

- [ ] **Step 1: Write ADR-0004**

`docs/adr/0004-security-headers-and-idle-session.md` (same prose style as ADR-0002 — narrative paragraph, Considered Options, Consequences):

```markdown
# Security headers and the 15-minute sliding idle session

The portal handles patient data but shipped no Content-Security-Policy — the highest-value XSS defence was absent — and better-auth's defaults kept sessions valid for seven days regardless of activity. We now split browser hardening by mechanism: the Next.js proxy generates a per-request nonce CSP (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `frame-ancestors 'none'`), `next.config.ts` carries the request-independent headers (`Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Permissions-Policy`, prod HSTS), and Express replaces bare `helmet()` with an explicit API config (`default-src 'none'`, frame-deny, no-referrer). Sessions are a sliding 15-minute idle window enforced at both ends from one shared constant: better-auth refreshes expiry (and re-issues the cookie) at most once a minute of activity and lets it lapse after 15 idle minutes server-side, while a client idle guard signs out proactively.

## Considered Options

- **Static CSP with `script-src 'unsafe-inline'`** (`headers()` only): no runtime complexity, but it defeats CSP's core purpose — injected inline scripts would execute.
- **Client-side idle logout only**: simplest, but a stolen cookie would stay valid for days; cosmetic enforcement.
- **`updateAgeOnGet: true` in better-auth config**: the flag no longer exists in 1.7 — refresh-on-access is default behaviour gated only by `updateAge`; verified against the installed source.

## Consequences

- `style-src 'unsafe-inline'` stays: Next injects inline styles, style hashing is brittle, and style-only injection cannot execute script. It is the accepted, documented trade-off.
- The API's CSP is `default-src 'none'` — an API renders nothing, anywhere.
- An actively-used session never expires by design (inactivity window, not an absolute cap); a continuously active tab stays signed in indefinitely.
- Dev and prod CSP differ only in dev allowances (`unsafe-eval` for React refresh, `ws:` for HMR); production adds `upgrade-insecure-requests`.
```

- [ ] **Step 2: Add the README Security section**

Insert after the "Technical decisions" section (before "Getting started"):

```markdown
---

## Security

Defences against the classic browser attack trio, plus where patient data can and cannot travel.

**XSS.** Every page ships a nonce-based Content-Security-Policy (`script-src 'self' 'nonce-…' 'strict-dynamic'`, generated per request by `src/proxy.ts`): an injected inline script — the payload shape of a reflected XSS — is refused execution even if attacker markup slips through React's escaping. The repo's only `dangerouslySetInnerHTML` injects a *static* chart-theme stylesheet, covered by `style-src`.

**CSRF.** All API traffic is same-origin by construction ([decision 2](#2-first-party-cookies-via-nextjs-rewrites-instead-of-cross-origin-cors)): the session cookie is first-party, `SameSite=Lax`, `httpOnly`, and better-auth validates Origin/Fetch-Metadata on state-changing auth calls. Sign-in is rate-limited (3 attempts / 10 s).

**Clickjacking.** `frame-ancestors 'none'` in both the web CSP and the API's helmet config, with `X-Frame-Options: DENY` as the legacy backstop — the portal refuses to be framed anywhere. See [decision 4](docs/adr/0004-security-headers-and-idle-session.md).

**Sessions.** A sliding 15-minute idle window enforced on both ends from one shared constant: the server session (and cookie) dies after 15 idle minutes, and a client idle guard signs out proactively with a toast — an abandoned tab can't outlive its session, and neither can a stolen cookie.

### Patient-data hygiene

- **Out of `localStorage`.** The portal reads and writes zero web storage — the session lives in an httpOnly cookie that even a successful XSS cannot read, and view state lives in TanStack Query memory and the URL.
- **Out of URLs.** List URLs persist only non-identifying filters (condition, doctor id, date range, page) — the patient name/phone search input is deliberately excluded from URL persistence. `Referrer-Policy: no-referrer` keeps query strings off the `Referer` header, and the browser never talks to any origin but the app's own.
- **Out of logs.** The API runs no request-logging middleware; the central error handler logs only the error object behind opaque 500s — never request bodies — and 4xx envelopes name fields, not values. Nothing a user types is written anywhere durable except the records they meant to create.
```

- [ ] **Step 3: Add a Highlights bullet and refresh test counts**

Add to the Highlights list:

```markdown
- **Hardened by default** — nonce-based CSP (XSS), first-party SameSite cookies + origin checks (CSRF), `frame-ancestors 'none'` (clickjacking), and a 15-minute sliding idle session on both client and server.
```

Run `bun run test` (root), count the tests, then update the badge (`tests-40_passing` → actual count) and the Testing & verification section's opening bullet to mention the header and session-slide suites.

- [ ] **Step 4: Commit (closes the issue)**

```bash
git add docs/adr/0004-security-headers-and-idle-session.md README.md
git commit -m "docs: ADR-0004 + README security and data-hygiene section (closes #10)"
```

- [ ] **Step 5: Final verification sweep**

Run from repo root:

```bash
bun run test && bun run check-types
```

Expected: full suite green (including `session.slide.test.ts`, `security-headers.test.ts`), typecheck clean.
