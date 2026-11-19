# Design: Security headers, idle-session logout, patient-data hygiene docs

Date: 2026-11-19
Status: Approved (pending implementation plan)

## Problem

The portal handles patient data but ships no Content-Security-Policy (the single
highest-value XSS defense is absent — `helmet()` defaults cover
`X-Frame-Options` and `Referrer-Policy` on API responses only, and the Next.js
HTML surface sends none of these), has no inactivity logout (better-auth
defaults keep sessions valid for 7 days regardless of activity), and documents
none of its data-hygiene properties in the README.

Goal: defences against XSS, CSRF and clickjacking in one project, a ~15-minute
inactivity logout enforced at both ends, and a short, strictly honest README
section on how patient data stays out of logs, URLs and web storage.

## Decisions

### 1. Shared session constants — `packages/auth/src/session.ts` (new)

Export `SESSION_IDLE_SECONDS = 60 * 15` and `SESSION_REFRESH_SECONDS = 60`.
Single source of truth imported by both apps (web already depends on this
package for the policy; server already imports `createAuth`), so the client
idle window and the server session window cannot drift.

### 2. Server-side sliding session — `createAuth` in `packages/auth`

```ts
session: {
  expiresIn: SESSION_IDLE_SECONDS,    // 15 min
  updateAgeOnGet: true,               // slide the window on session use
  updateAge: SESSION_REFRESH_SECONDS, // refresh at most once per minute
}
```

Every authenticated request slides expiry to now + 15 min: page loads through
the RSC session guard (`requireSession` → `/api/auth/get-session`), client
fetches through the rewrites. Idle 15 minutes → session record and cookie die
server-side, so a stolen cookie also goes inert. The requested semantic is an
*inactivity* window, not an absolute cap; a continuously active session stays
alive by design.

Implementation-time verification: read the installed better-auth 1.7 source to
confirm the session-refresh path re-issues the cookie (maxAge must track the
slid expiry, not the original sign-in time).

### 3. Client idle guard — `apps/web`

- `src/hooks/use-idle-session.ts`: ref-held `lastActivity`; listeners on
  `pointermove`, `pointerdown`, `keydown`, `wheel`, `touchstart` reset it
  (throttled to once/minute); a single `setTimeout` of 15 min fires sign-out.
  No re-renders, no state.
- Timeout flow: `authClient.signOut()` → `router.replace("/login")` →
  `toast.info("Signed out due to inactivity")`. The root `Providers` (Toaster)
  survives the route change, so the toast lands on `/login` with no URL param —
  no exception to the URLs claim.
- Background-tab edge case: browsers throttle timers while hidden; on
  `visibilitychange` to visible, compare real elapsed time against
  `lastActivity` and sign out immediately if the window has passed.
- Mounted as `<IdleSessionGuard />` (tiny client component) in
  `src/app/(app)/layout.tsx`, the RSC-gated shell — `/login` never arms it.
- A 401 from an already-lapsed server session flows through the existing fetch
  wrapper; its current 401 handling is checked during planning and aligned.

### 4. Nonce-based CSP — `apps/web/src/proxy.ts` (new)

Official Next.js pattern (Next 16 renamed middleware → `proxy`;
`PROXY_FILENAME = 'proxy'` confirmed in 16.4.6). Per request:

```
default-src 'self';
script-src 'self' 'nonce-<nonce>' 'strict-dynamic';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self';
frame-ancestors 'none';
```

- Nonce is set on the request headers (`x-nonce` + CSP request header) so Next
  injects it into its inline bootstrap scripts; the CSP response header is set
  on the same pass.
- Dev variant adds `'unsafe-eval'` (React refresh/HMR) and `ws:` to
  `connect-src`; production stays strict.
- Matcher excludes `/api/:path*` (rewritten responses — Express owns those
  headers), `_next/static`, `_next/image`, favicon.
- Accepted trade-off: `style-src 'unsafe-inline'` stays (Next dev injects
  inline styles; style hashing is brittle; style-only injection cannot
  execute script). Documented in ADR + README rather than hidden.

### 5. Static headers — `next.config.ts` `headers()`

On every route: `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`
(legacy backstop beneath `frame-ancestors`), `Permissions-Policy: camera=(),
microphone=(), geolocation=()`, `Strict-Transport-Security` in production.
CSP is *not* duplicated here — the proxy owns it; one place can break it.

### 6. Express helmet made explicit — `apps/server/src/index.ts`

```ts
helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
  },                         // an API renders nothing, anywhere
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "no-referrer" },
})
```

HSTS (helmet's always-on default), `noSniff`, COOP/CORP etc. keep helmet
defaults — that is the API's layer; the web app's gated HSTS above is the
other. The API's header story becomes explicit and testable instead of riding
library defaults.

### 7. Tests and verification

- Server (bun test): boot the app and assert `/health` and an `/api/v1`
  response carry CSP, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`.
- Session slide: assert a session fetch past `updateAge` pushes `expiresAt`
  forward, and an idle window lets the session lapse (bootstrap pattern per
  existing test setup).
- Web: no test runner exists in `apps/web` — the idle guard is verified
  manually (temporarily shortened constant locally, then the final constant)
  plus `check-types`. Stated honestly here and in the plan.
- Manual: `curl -I` on a web page shows the nonce CSP changing per request;
  `/health` shows the helmet set.

### 8. Docs — ADR-0004 + README "Security" section

- `docs/adr/0004-security-headers-and-idle-session.md`: the decisions and
  trade-offs above (style `unsafe-inline`, sliding-session semantics, API CSP
  `default-src 'none'`).
- README: a short **Security** section covering XSS (nonce CSP; no
  `dangerouslySetInnerHTML` anywhere in the web app), CSRF (unchanged:
  first-party cookies via rewrites, `SameSite=Lax`, better-auth origin +
  Fetch-Metadata checks), clickjacking (`frame-ancestors 'none'` + XFO DENY)
  — plus the patient-data hygiene subsection with grep-verifiable claims:
  - *Out of localStorage*: zero `localStorage`/`sessionStorage` usage in the
    web app; the session is an httpOnly `SameSite=Lax` cookie that even a
    successful XSS cannot read; client state lives in TanStack Query memory.
  - *Out of URLs*: page URLs persist only condition / doctor-id / dates /
    page — the `search` input is deliberately excluded from URL persistence
    (`Omit<PatientListQuery, "search">` in patients-view);
    `Referrer-Policy: no-referrer` keeps query strings off the `Referer`
    header; every origin is first-party, so no third party can observe one.
  - *Out of logs*: no request-logging middleware; the central error handler
    logs only the error object and returns opaque 500s, never request bodies;
    4xx envelopes carry field names, not values.

## Out of scope (deliberately)

CSP reporting (`report-uri` / `report-to`), rate-limit storage persistence,
`__Secure-` cookie-prefix hardening, absolute session cap, web test-runner
introduction, changes to the demo-credential flow.
