import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createPortalAuthClient } from "@/lib/auth-client";

/**
 * Read the session server-side with the visitor's cookies forwarded.
 * Node fetch needs an absolute URL, so the client is built against the
 * request's own origin — the session call still flows through the
 * /api/auth rewrite to Express (ADR-0002). Anything but a live session —
 * no cookie, expired, or fetch failure — resolves to null so guards fail
 * closed.
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
  const { data: session } = await client.getSession({
    fetchOptions: { headers: requestHeaders },
  });
  return session;
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
