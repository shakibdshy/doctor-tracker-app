"use client";

import { can } from "@doctor-tracker-app/auth/policy";
import { Badge } from "@doctor-tracker-app/ui/components/badge";
import { Button } from "@doctor-tracker-app/ui/components/button";
import { Card } from "@doctor-tracker-app/ui/components/card";
import { ConfirmDialog } from "@doctor-tracker-app/ui/components/confirm-dialog";
import { DataTable } from "@doctor-tracker-app/ui/components/data-table";
import type { DataTableColumn } from "@doctor-tracker-app/ui/components/data-table";
import { ListPagination } from "@doctor-tracker-app/ui/components/pagination";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ArrowLeftIcon, PlusIcon, UnlinkIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { apiFetch, apiErrorMessage, type Doctor, type Patient } from "@/lib/api";
import { useOptimisticUnassign } from "@/lib/hooks";
import { dateFormatter } from "@/lib/format";

import { PatientCard } from "../../patients/patient-card";
import { PatientFormDialog } from "../../patients/patient-form-dialog";

const DETAIL_PAGE_SIZE = 5;

export default function DoctorDetailView({
  doctorId,
  role,
}: {
  doctorId: string;
  role: string | null | undefined;
}) {
  const canCreate = can(role, "patient:create");
  const canAssign = can(role, "patient:assign");

  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  const doctorQuery = useQuery({
    queryKey: ["doctor", doctorId],
    queryFn: () => apiFetch<Doctor>(`/api/v1/doctors/${doctorId}`),
    retry: false,
  });

  const patientsQuery = useQuery({
    queryKey: ["patients", { doctor: doctorId, page }],
    queryFn: () =>
      apiFetch<Patient[]>(
        `/api/v1/patients?doctor=${doctorId}&page=${page}&limit=${DETAIL_PAGE_SIZE}`,
      ),
    placeholderData: keepPreviousData,
  });

  const patientsListKey = ["patients", { doctor: doctorId, page }] as const;

  // Unassign from this doctor's list is optimistic, same contract as the
  // patients page — the record joins the unassigned pool.
  // This list is the doctor's assignment, so unassignment removes the row.
  const unassignMutation = useOptimisticUnassign(
    ["patients", { doctor: doctorId, page }],
    "removeRow",
  );

  const doctor = doctorQuery.data?.data;

  const columns = useMemo<DataTableColumn<Patient>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Patient",
        cell: (ctx) => (
          <div className="min-w-0">
            <span className="font-medium">{ctx.row.original.name}</span>
            <p className="text-muted-foreground text-xs">{ctx.row.original.phone}</p>
          </div>
        ),
      },
      {
        accessorKey: "gender",
        header: "Gender",
        cell: (ctx) => (
          <span className="text-muted-foreground capitalize">{ctx.getValue() as string}</span>
        ),
      },
      {
        accessorKey: "condition",
        header: "Condition",
        cell: (ctx) => <Badge variant="outline">{ctx.getValue() as string}</Badge>,
      },
      {
        accessorKey: "dateOfBirth",
        header: "Born",
        cell: (ctx) => (
          <span className="text-muted-foreground tabular-nums">
            {dateFormatter.format(new Date(ctx.row.original.dateOfBirth))}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Added",
        cell: (ctx) => (
          <span className="text-muted-foreground tabular-nums">
            {dateFormatter.format(new Date(ctx.row.original.createdAt))}
          </span>
        ),
      },
      ...(canAssign
        ? [
            {
              id: "actions",
              header: "",
              cell: (ctx) => (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Unassign ${ctx.row.original.name}`}
                    >
                      <UnlinkIcon />
                    </Button>
                  }
                  title={`Unassign ${ctx.row.original.name}?`}
                  description="The patient keeps their record and joins the unassigned pool."
                  confirmLabel="Unassign patient"
                  onConfirm={() => unassignMutation.mutateAsync(ctx.row.original)}
                  isPending={unassignMutation.isPending}
                />
              ),
            } satisfies DataTableColumn<Patient>,
          ]
        : []),
    ],
    [canAssign, unassignMutation],
  );

  if (doctorQuery.isError) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/doctors"
          className="text-muted-foreground flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to doctors
        </Link>
        <Card className="p-8">
          <p className="text-muted-foreground text-sm">
            This doctor could not be found — they may have been deleted.
          </p>
        </Card>
      </div>
    );
  }

  const patientsMeta = patientsQuery.data?.meta;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/doctors"
          className="text-muted-foreground flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to doctors
        </Link>
      </div>

      {doctorQuery.isLoading ? (
        <Card className="h-24 animate-pulse" />
      ) : doctor ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{doctor.name}</h2>
              <Badge variant="secondary">{doctor.specialization}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {doctor.hospital} · {doctor.phone} · {doctor.email}
            </p>
          </div>
          {canCreate ? (
            <Button onClick={() => setAddOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Add patient
            </Button>
          ) : null}
        </Card>
      ) : null}

      <div className="rounded-lg border bg-card p-2">
        <DataTable
          columns={columns}
          data={patientsQuery.data?.data ?? []}
          getRowId={(patient) => patient.id}
          isLoading={patientsQuery.isLoading}
          error={patientsQuery.error}
          onRetry={() => void patientsQuery.refetch()}
          emptyMessage={
            canAssign
              ? "No patients assigned yet — add one from here."
              : "No patients assigned to this doctor."
          }
          renderCard={(patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              canAssign={canAssign}
              onUnassign={(target) => unassignMutation.mutateAsync(target)}
              unassignPending={unassignMutation.isPending}
            />
          )}
        />
        {patientsMeta && patientsMeta.total > 0 ? (
          <div className="border-t p-3">
            <ListPagination
              page={patientsMeta.page}
              totalPages={patientsMeta.totalPages}
              total={patientsMeta.total}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>

      {doctor ? (
        <PatientFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          lockedDoctor={doctor}
        />
      ) : null}
    </div>
  );
}
