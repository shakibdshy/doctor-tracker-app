import { requireSession } from "@/lib/session";

import DoctorsDemo from "./doctors-demo";

export const metadata = { title: "Doctors — Doctor Tracker" };

export default async function DoctorsPage() {
  const { user } = await requireSession();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Doctors</h1>
        <p className="text-muted-foreground text-sm">
          Design-system demo — the live roster connects in the doctor-roster
          ticket.
        </p>
      </header>
      <DoctorsDemo role={user.role} />
    </div>
  );
}
