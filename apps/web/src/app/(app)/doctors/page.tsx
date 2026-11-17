import { requireSession } from "@/lib/session";

import DoctorsView from "./doctors-view";

export const metadata = { title: "Doctors — Doctor Tracker" };

export default async function DoctorsPage() {
  const { user } = await requireSession();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Doctors</h1>
        <p className="text-muted-foreground text-sm">
          The doctor roster — search, filter, and manage from here.
        </p>
      </header>
      <DoctorsView role={user.role} />
    </div>
  );
}
