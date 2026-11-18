import type { TeamUserCreateInput } from "@doctor-tracker-app/auth/team-user";

import { authClient } from "@/lib/auth-client";

export type TeamUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
  banned: boolean | null;
  banReason?: string | null;
  createdAt: string;
};

function errorMessage(error: { message?: string } | null | undefined): string {
  return error?.message ?? "Something went wrong. Please try again.";
}

/**
 * Team management rides better-auth's admin endpoints (through the /api/auth
 * rewrite) instead of the /api/v1 envelope, so these fetchers unwrap the
 * better-auth `{ data, error }` result and throw on error.
 */
export async function listTeamUsers(): Promise<TeamUser[]> {
  const { data, error } = await authClient.admin.listUsers({
    query: { limit: 100, sortBy: "createdAt", sortDirection: "desc" },
  });
  if (error) throw new Error(errorMessage(error));
  return (data?.users ?? []) as unknown as TeamUser[];
}

export async function setTeamUserRole(input: { userId: string; role: TeamUser["role"] }) {
  const { error } = await authClient.admin.setRole({
    userId: input.userId,
    role: input.role as "admin" | "staff",
  });
  if (error) throw new Error(errorMessage(error));
}

export async function banTeamUser(userId: string) {
  const { error } = await authClient.admin.banUser({
    userId,
    banReason: "Access revoked by an administrator",
  });
  if (error) throw new Error(errorMessage(error));
}

export async function unbanTeamUser(userId: string) {
  const { error } = await authClient.admin.unbanUser({ userId });
  if (error) throw new Error(errorMessage(error));
}

export async function createTeamUser(values: TeamUserCreateInput) {
  const { error } = await authClient.admin.createUser(values);
  if (error) throw new Error(errorMessage(error));
}
