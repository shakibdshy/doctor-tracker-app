import helmet from "helmet";

/**
 * Browser-facing headers on every API response — explicit rather than
 * helmet's defaults so the defence story is visible and testable: an API
 * renders nothing (CSP `default-src 'none'`, `frame-ancestors 'none'`),
 * refuses framing outright (XFO DENY), and sends no referrer. HSTS and
 * no-sniff keep helmet's defaults; the web app's headers live in Next
 * (next.config.ts + proxy.ts) — this is the API layer only. (Next's
 * static-header list also stamps the identical XFO/Referrer-Policy values
 * on rewritten /api/* responses at the edge; values agree, so ownership is
 * belt-and-suspenders rather than a conflict.)
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
