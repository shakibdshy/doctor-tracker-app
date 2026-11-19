# Security headers and the 15-minute sliding idle session

The portal handles patient data but shipped no Content-Security-Policy — the highest-value XSS defence was absent — and better-auth's defaults kept sessions valid for seven days regardless of activity. Browser hardening now splits by mechanism: the Next.js proxy generates a per-request nonce CSP (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `frame-ancestors 'none'`), `next.config.ts` carries the request-independent headers (`Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Permissions-Policy`, prod HSTS), and Express replaces bare `helmet()` with an explicit API config (`default-src 'none'`, frame-deny, no-referrer). Sessions are a sliding 15-minute idle window enforced at both ends from one shared constant (`SESSION_IDLE_SECONDS` in `packages/auth`): better-auth refreshes expiry — and re-issues the cookie with a fresh maxAge — at most once a minute of activity and lets it lapse after 15 idle minutes server-side, while a client idle guard signs out proactively with a toast.

## Considered Options

- **Static CSP with `script-src 'unsafe-inline'`** (`headers()` only): no runtime complexity, but it defeats CSP's core purpose — injected inline scripts would execute.
- **Client-side idle logout only**: simplest, but a stolen cookie would stay valid for days; cosmetic enforcement.
- **`updateAgeOnGet: true` in better-auth config**: the flag no longer exists in 1.7 — refresh-on-access is default behaviour gated only by `updateAge`; verified against the installed source.

## Consequences

- `style-src 'unsafe-inline'` stays: Next injects inline styles, style hashing is brittle, and style-only injection cannot execute script. It is the accepted, documented trade-off.
- The API's CSP is `default-src 'none'` — an API renders nothing, anywhere.
- An actively-used session never expires by design (inactivity window, not an absolute cap); a continuously active tab stays signed in indefinitely.
- Dev and prod CSP differ only in dev allowances (`unsafe-eval` for React refresh, `ws:` for HMR); production adds `upgrade-insecure-requests`.
- Anything that injects its own inline script must carry the nonce: next-themes' theme bootstrap gets it threaded through the root layout (`x-nonce` request header set by the proxy), because under `strict-dynamic` Next does not stamp third-party inline scripts and hash-based fallbacks are ignored.
- The web idle guard imports the constants via the `@doctor-tracker-app/auth/session` subpath, never the package root — the root re-exports `createAuth`, whose better-auth/MongoDB dependency tree must not reach the browser bundle.
- Reading `headers()` in the root layout (for the nonce) opts every route out of static prerendering — inherent to Next's official nonce pattern and moot for an auth-gated portal where every page is already session-checked.
