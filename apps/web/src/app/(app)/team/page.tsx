import { can } from "@doctor-tracker-app/auth/policy";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/session";

export const metadata = { title: "Team — Doctor Tracker" };

// Admin-only surface, enforced here and (once the team feature lands) on the
// server's admin-plugin endpoints. Staff who type the URL get bounced.
export default async function TeamPage() {
  const { user } = await requireSession();
  if (!can(user.role, "team:manage")) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Team</h1>
      <p className="text-muted-foreground mt-6 text-sm">
        User provisioning and role management are coming soon.
      </p>
    </div>
  );
}
