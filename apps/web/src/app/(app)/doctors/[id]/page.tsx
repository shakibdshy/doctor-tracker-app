import { requireSession } from "@/lib/session";

import DoctorDetailView from "@/features/doctors/components/doctor-detail-view";

export const metadata = { title: "Doctor — Doctor Tracker" };

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSession();
  const { id } = await params;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <DoctorDetailView doctorId={id} role={user.role} />
    </div>
  );
}
