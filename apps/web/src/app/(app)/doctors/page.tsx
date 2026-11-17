import { requireSession } from "@/lib/session";

export const metadata = { title: "Doctors — Doctor Tracker" };

// Placeholder: the doctor roster (search, filters, CRUD) arrives with the
// doctor roster ticket.
export default async function DoctorsPage() {
  await requireSession();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Doctors</h1>
      <p className="text-muted-foreground mt-6 text-sm">
        The doctor roster is coming soon.
      </p>
    </div>
  );
}
