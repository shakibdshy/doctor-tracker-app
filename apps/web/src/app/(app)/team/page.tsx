import { can } from "@doctor-tracker-app/auth/policy";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/session";

import TeamView from "./team-view";

export const metadata = { title: "Team — Doctor Tracker" };

// Admin-only surface, enforced here and on the better-auth admin endpoints
// (adminRoles: ["admin"]). Staff who type the URL get bounced.
export default async function TeamPage() {
  const { user } = await requireSession();
  if (!can(user.role, "team:manage")) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-muted-foreground text-sm">
          Provision users, set roles, and revoke access.
        </p>
      </header>
      <TeamView currentUserId={user.id} />
    </div>
  );
}
