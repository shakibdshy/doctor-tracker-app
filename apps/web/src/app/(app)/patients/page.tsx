import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/session";

import PatientsView from "@/features/patients/components/patients-view";

export const metadata = { title: "Patients — Doctor Tracker" };

export default async function PatientsPage() {
  const { user } = await requireSession();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        className="mb-5"
        title="Patients"
        description="The patient population — search, filter, assign, and manage from here."
      />
      <PatientsView role={user.role} />
    </div>
  );
}
