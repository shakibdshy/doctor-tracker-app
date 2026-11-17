# First-party API cookies via Next.js rewrites

The scaffold shipped cross-site auth cookies (`sameSite: none`) between the Next.js client and the standalone Express server. On separate production hosts (e.g. `*.vercel.app` ↔ any server host) those are third-party cookies, blocked by default in Chrome incognito and Safari — which would break the required incognito acceptance test. We route all browser API calls through Next.js rewrites (`/api/*` → the Express server) in both dev and production, making every cookie first-party (`sameSite: lax`), eliminating CORS, and keeping the setup host-agnostic while the server hosting decision is deferred.

## Considered Options

- **Bearer-token plugin** (Authorization header): cookie-free but diverges from better-auth's default session flow and adds client token handling.
- **Custom domains on a shared root**: restores same-site cookies but requires DNS ownership and per-host setup.

## Consequences

- Express remains a standalone REST server, independently reachable and deployable; the rewrite is routing, not a merge of the two applications.
- The browser never calls the Express origin directly; `NEXT_PUBLIC_SERVER_URL` is used by the rewrite destination, not by client fetches.