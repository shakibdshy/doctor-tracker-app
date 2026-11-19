import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

const withVarlock = varlockNextConfigPlugin();
import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  async headers() {
    return [{ source: "/:path*", headers: staticSecurityHeaders() }];
  },
  // All browser API traffic is proxied to the Express server, keeping session
  // cookies first-party (ADR-0002). The destination env var is only read
  // server-side; the browser never calls the server origin directly.
  rewrites() {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
    if (!serverUrl) {
      throw new Error(
        "NEXT_PUBLIC_SERVER_URL is required: /api/auth and /api/v1 rewrites target the Express server (ADR-0002)",
      );
    }
    return [
      { source: "/api/auth/:path*", destination: `${serverUrl}/api/auth/:path*` },
      { source: "/api/v1/:path*", destination: `${serverUrl}/api/v1/:path*` },
    ];
  },
};

export default withVarlock(nextConfig);
