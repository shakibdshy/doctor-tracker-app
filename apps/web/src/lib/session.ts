import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createPortalAuthClient } from "@/lib/auth-client";

/**
 * Read the session server-side with the visitor's cookies forwarded.
 * Node fetch needs an absolute URL, so the client is built against the
 * request's own origin — the session call still flows through the
 * /api/auth rewrite to Express (ADR-0002). Anything but a live session —
 * no cookie, expired, or fetch failure — resolves to null so guards fail
 * closed: the API being unreachable must degrade to the sign-in gate,
 * never take the portal down with it (better-auth's client throws on
 * connection errors, so the call is guarded here).
 */
export async function getSessionServer() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("[::1]") ? "http" : "https");
  if (!host) {
    return null;
  }
  const client = createPortalAuthClient(`${proto}://${host}`);
  try {
    const { data: session } = await client.getSession({
      fetchOptions: { headers: requestHeaders },
    });
    return session;
  } catch {
    // API unreachable (connection refused, DNS failure, reset socket):
    // guards fail closed — visitors land on /login instead of a 500.
    return null;
  }
}

/**
 * Guard for every protected page: unauthenticated visitors are redirected
 * to /login before anything renders. The returned session carries
 * `user.role`, which pages use for server-side role gates.
 */
export async function requireSession() {
  const session = await getSessionServer();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}
