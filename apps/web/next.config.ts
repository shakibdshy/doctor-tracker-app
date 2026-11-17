import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

const withVarlock = varlockNextConfigPlugin();
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
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
