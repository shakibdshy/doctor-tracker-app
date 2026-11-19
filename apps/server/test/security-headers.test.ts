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
