import { can } from "@doctor-tracker-app/auth/policy";
import { redirect } from "next/navigation";

import { PageHeader } from "@doctor-tracker-app/ui/components/page-header";
import { requireSession } from "@/lib/session";

import TeamView from "@/features/team/components/team-view";

export const metadata = { title: "Team — Doctor Tracker" };

// Admin-only surface, enforced here and on the better-auth admin endpoints
// (adminRoles: ["admin"]). Staff who type the URL get bounced.
export default async function TeamPage() {
  const { user } = await requireSession();
  if (!can(user.role, "team:manage")) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        className="mb-5"
        title="Team"
        description="Provision users, set roles, and revoke access."
      />
      <TeamView currentUserId={user.id} />
    </div>
  );
}
