import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/session";

import DoctorsView from "./doctors-view";

export const metadata = { title: "Doctors — Doctor Tracker" };

export default async function DoctorsPage() {
  const { user } = await requireSession();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        className="mb-5"
        title="Doctors"
        description="The doctor roster — search, filter, and manage from here."
      />
      <DoctorsView role={user.role} />
    </div>
  );
}
