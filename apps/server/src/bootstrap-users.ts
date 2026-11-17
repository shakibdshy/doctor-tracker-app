import { auth } from "./services";

/** Demo credentials the README documents; provisioned by bootstrap and seed. */
export const DEMO_USERS = [
  {
    name: "Demo Admin",
    email: "admin@doctracker.dev",
    password: "Admin#12345",
    role: "admin",
  },
  {
    name: "Demo Staff",
    email: "staff@doctracker.dev",
    password: "Staff#12345",
    role: "staff",
  },
] as const;

/**
 * Provision the demo Admin and demo Staff so both roles are sign-in-ready.
 * Idempotent — safe to re-run. Public sign-up is disabled, so this is the
 * only path accounts exist through until the Team page (issue #6) lands.
 */
export async function ensureDemoUsers(): Promise<void> {
  const authContext = await auth.$context;
  for (const demo of DEMO_USERS) {
    const existing = await authContext.internalAdapter.findUserByEmail(demo.email);
    if (existing?.user) {
      console.log(`[bootstrap] ${demo.role} already provisioned: ${demo.email}`);
      continue;
    }
    // Mirror the credential sign-up internals: user first, then a hashed
    // credential account whose accountId is the user id.
    const user = await authContext.internalAdapter.createUser(
      { email: demo.email, name: demo.name, emailVerified: true, role: demo.role },
      { method: "email-password" },
    );
    if (!user) throw new Error(`[bootstrap] failed to create ${demo.email}`);
    const hash = await authContext.password.hash(demo.password);
    await authContext.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hash,
    });
    console.log(`[bootstrap] created ${demo.role}: ${demo.email}`);
  }
}
