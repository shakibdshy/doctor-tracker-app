import { z } from "zod";

/**
 * Admin user-provisioning grammar (Team page): name, email, password, role.
 * Shared by the form and any future server-side validation of provisioning.
 */
export const teamUserCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  role: z.enum(["admin", "staff"]),
});

export type TeamUserCreateInput = z.infer<typeof teamUserCreateSchema>;

export const TEAM_ROLES = ["admin", "staff"] as const;
