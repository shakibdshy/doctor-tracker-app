import { createAccessControl } from "better-auth/plugins/access";

/**
 * Capability statements — the single source of truth for portal permissions.
 * The better-auth admin plugin's team endpoints and the /api/v1 route
 * middleware both enforce this same matrix (see `can`).
 *
 * `user`/`session` mirror better-auth's default admin statements (create,
 * list, set-role, ban, …) so the admin plugin's own authorization checks
 * pass for Admins once custom roles are registered; they are domain-neutral.
 */
export const statements = {
  doctor: ["read", "create", "update", "delete"],
  patient: ["read", "create", "update", "assign", "delete"],
  dashboard: ["read"],
  team: ["manage"],
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "impersonate-admins",
    "delete",
    "set-password",
    "set-email",
    "set-phone",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
} as const;

export type Capability = {
  [Resource in keyof typeof statements]: `${Resource}:${(typeof statements)[Resource][number]}`;
}[keyof typeof statements];

export const accessControl = createAccessControl(statements);

/**
 * Portal roles per GLOSSARY.md: Admin (full access) and Staff (day-to-day
 * patient care records — no patient delete, no doctor mutations, no team).
 */
export const roles = {
  // Admin holds every statement by definition.
  admin: accessControl.newRole(statements),
  staff: accessControl.newRole({
    doctor: ["read"],
    patient: ["read", "create", "update", "assign"],
    dashboard: ["read"],
  }),
} as const;

export type RoleId = keyof typeof roles;

/** Every capability the portal enforces. */
export const capabilities: readonly Capability[] = Object.entries(statements).flatMap(
  ([resource, actions]) => actions.map((action) => `${resource}:${action}`),
) as Capability[];

/**
 * The pure permission-policy function: does `role` hold `capability`?
 * `role` mirrors better-auth's stored value (may be comma-separated).
 * Unknown roles and unknown capabilities are always denied.
 */
export function can(role: string | undefined | null, capability: Capability): boolean {
  if (!role) return false;
  // Runtime guard for values that bypassed the type (route config, session data).
  if (!capabilities.includes(capability)) return false;
  const [resource, action] = capability.split(":") as [string, string];
  for (const roleId of role.split(",")) {
    const assigned = roles[roleId as RoleId];
    // The capability string was validated against `statements`, so the
    // authorize request matches its shape; narrowed via the single cast below.
    const request = { [resource]: [action] } as Parameters<typeof assigned.authorize>[0];
    if (assigned?.authorize(request).success) return true;
  }
  return false;
}
