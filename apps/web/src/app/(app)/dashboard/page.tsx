import { requireSession } from "@/lib/session";

import Dashboard from "./dashboard";

export const metadata = { title: "Dashboard — Doctor Tracker" };

export default async function DashboardPage() {
  const { user } = await requireSession();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">Welcome back, {user.name}</p>
      <Dashboard />
    </div>
  );
}
