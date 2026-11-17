import { requireSession } from "@/lib/session";

import PatientsView from "./patients-view";

export const metadata = { title: "Patients — Doctor Tracker" };

export default async function PatientsPage() {
  const { user } = await requireSession();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Patients</h1>
        <p className="text-muted-foreground text-sm">
          The patient population — search, filter, assign, and manage from here.
        </p>
      </header>
      <PatientsView role={user.role} />
    </div>
  );
}
