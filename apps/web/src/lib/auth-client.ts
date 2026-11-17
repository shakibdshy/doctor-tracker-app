import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { accessControl, roles } from "@doctor-tracker-app/auth/policy";

/**
 * Same-origin by design: every /api/auth request flows through the Next.js
 * rewrites to the Express server (ADR-0002), so session cookies are
 * first-party and no cross-origin client configuration is needed. The admin
 * client plugin mirrors the server's admin plugin (same access control and
 * roles) so session types carry the portal role.
 *
 * In the browser, requests stay relative and hit the rewrite. Server
 * components build their own instance with an absolute base (Node fetch
 * cannot resolve relative URLs) — see lib/session.ts.
 */
export function createPortalAuthClient(baseURL?: string) {
  return createAuthClient({
    baseURL,
    plugins: [adminClient({ ac: accessControl, roles })],
  });
}

export const authClient = createPortalAuthClient();
