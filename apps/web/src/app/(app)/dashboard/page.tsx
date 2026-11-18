import { PageHeader } from "@doctor-tracker-app/ui/components/page-header";
import { requireSession } from "@/lib/session";

import Dashboard from "@/features/dashboard/components/dashboard-view";

export const metadata = { title: "Dashboard — Doctor Tracker" };

export default async function DashboardPage() {
  const { user } = await requireSession();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Dashboard" description={`Welcome back, ${user.name}`} />
      <Dashboard />
    </div>
  );
}
