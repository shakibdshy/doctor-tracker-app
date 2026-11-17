import { requireSession } from "@/lib/session";

export const metadata = { title: "Patients — Doctor Tracker" };

// Placeholder: the patients list (search, filters, CRUD, assignments)
// arrives with the patients ticket.
export default async function PatientsPage() {
  await requireSession();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Patients</h1>
      <p className="text-muted-foreground mt-6 text-sm">
        Patient management is coming soon.
      </p>
    </div>
  );
}
