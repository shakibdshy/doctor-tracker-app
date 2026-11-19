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
  // The renderer extracts the nonce from this CSP header for its own
  // scripts; x-nonce carries it to server components (next-themes' theme
  // script needs it too — the only inline script Next doesn't stamp).
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  // Everything that renders HTML; static assets and rewritten API traffic
  // excluded. Lookaheads pin to segment boundaries so a future route like
  // /api-docs would still get the CSP.
  matcher: ["/((?!api(?:/|$)|_next/static/|_next/image/|favicon\\.ico$).*)"],
};
