import type { Database } from "@doctor-tracker-app/db";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins/admin";

import { accessControl, roles } from "./policy";
import { SESSION_IDLE_SECONDS, SESSION_REFRESH_SECONDS } from "./session";

export {
  accessControl,
  capabilities,
  can,
  roles,
  statements,
  type Capability,
  type RoleId,
} from "./policy";

export { SESSION_IDLE_SECONDS, SESSION_REFRESH_SECONDS } from "./session";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
};

export function createAuth(
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = [],
) {
  return betterAuth({
    database: mongodbAdapter(database),
    trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
    // Credentials-only portal: users are provisioned by Admins on the Team
    // page, so public sign-up is disabled at the API, not just hidden in the UI.
    emailAndPassword: { enabled: true, disableSignUp: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    rateLimit: {
      // Brute-force throttle on the credentials path; every other auth path
      // (including admin-plugin endpoints) keeps the built-in defaults.
      enabled: true,
      customRules: {
        "/sign-in/email": { window: 10, max: 3 },
      },
    },
    session: {
      // Sliding idle window (ADR-0004): better-auth refreshes on session
      // use when now - updatedAt >= updateAge, re-issuing the cookie with
      // a fresh maxAge — so a stolen cookie goes inert after 15 idle
      // minutes, while an active user never sees a re-prompt.
      expiresIn: SESSION_IDLE_SECONDS,
      updateAge: SESSION_REFRESH_SECONDS,
    },
    plugins: [
      admin({
        ac: accessControl,
        roles,
        defaultRole: "staff",
      }),
    ],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
