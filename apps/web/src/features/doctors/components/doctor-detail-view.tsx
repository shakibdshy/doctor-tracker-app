"use client";

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
import { useEffect, useMemo, useRef, useState } from "react";

import { PatientCard } from "@/features/patients/components/patient-card";
import { PatientFormDialog } from "@/features/patients/components/patient-form-dialog";
import { listPatients, type Patient } from "@/features/patients/api";
import { patientKeys, useOptimisticUnassign } from "@/features/patients/queries";
import { dateFormatter } from "@/lib/format";
import { usePermissions } from "@/hooks/use-permissions";

import type { Doctor } from "../api";
import { useDoctor } from "../queries";

const DETAIL_PAGE_SIZE = 5;

export default function DoctorDetailView({
  doctorId,
  role,
}: {
  doctorId: string;
  role: string | null | undefined;
}) {
  const { canCreatePatient, canAssignPatient } = usePermissions(role);

  // Keyset pagination (ADR-0003): local state instead of URL params (this
  // page has no filter context). Each visited page's cursor is remembered in
  // a stack for Previous to walk back.
  const [page, setPage] = useState(1);
  const [cursor, setCursor] = useState<string | null>(null);
  const cursorsRef = useRef(new Map<number, string | null>([[1, null]]));
  const [knownTotals, setKnownTotals] = useState<{ total: number; totalPages: number } | null>(
    null,
  );
  const [addOpen, setAddOpen] = useState(false);

  const gotoPage = (target: number) => {
    const clamped = Math.max(1, target);
    if (clamped === page) return;
    setPage(clamped);
    setCursor(cursorsRef.current.get(clamped) ?? null);
  };

  const doctorQuery = useDoctor(doctorId);

  const patientsQuery = useQuery({
    queryKey: patientKeys.list({ doctor: doctorId, page, cursor }),
    queryFn: () => listPatients({ doctor: doctorId, cursor, limit: DETAIL_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  // Totals ride only the first page; keep the last known values so the
  // header and pager don't flicker while paging. Placeholder data (the
  // previous page's response during a fetch) never updates them.
  const meta = !patientsQuery.isPlaceholderData ? patientsQuery.data?.meta : undefined;
  useEffect(() => {
    if (meta?.total !== undefined) {
      setKnownTotals({ total: meta.total, totalPages: meta.totalPages ?? 1 });
    }
  }, [meta]);
  useEffect(() => {
    cursorsRef.current.set(page, cursor);
    if (meta?.nextCursor) cursorsRef.current.set(page + 1, meta.nextCursor);
  }, [page, cursor, meta]);

  // Unassign from this doctor's list is optimistic, same contract as the
  // patients page — the record joins the unassigned pool.
  // This list is the doctor's assignment, so unassignment removes the row.
  const unassignMutation = useOptimisticUnassign(
    patientKeys.list({ doctor: doctorId, page, cursor }),
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
            <p className="text-muted-foreground font-mono text-xs">{ctx.row.original.phone}</p>
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
          <span className="font-mono text-[13px] text-muted-foreground tabular-nums">
            {dateFormatter.format(new Date(ctx.row.original.dateOfBirth))}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Added",
        cell: (ctx) => (
          <span className="font-mono text-[13px] text-muted-foreground tabular-nums">
            {dateFormatter.format(new Date(ctx.row.original.createdAt))}
          </span>
        ),
      },
      ...(canAssignPatient
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
    [canAssignPatient, unassignMutation],
  );

  if (doctorQuery.isError) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/doctors"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/doctors"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to doctors
        </Link>
      </div>

      {doctorQuery.isLoading ? (
        <Card className="h-24 animate-pulse" />
      ) : doctor ? (
        <Card className="flex flex-row flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-center gap-4">
            <span
              aria-hidden
              className="bg-secondary text-secondary-foreground font-display flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
            >
              {doctor.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]!.toUpperCase())
                .join("")}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                  {doctor.name}
                </h2>
                <Badge variant="secondary">{doctor.specialization}</Badge>
              </div>
              <p className="text-muted-foreground mt-1 truncate font-mono text-[13px]">
                {doctor.hospital} · {doctor.phone} · {doctor.email}
              </p>
            </div>
          </div>
          {canCreatePatient ? (
            <Button onClick={() => setAddOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Add patient
            </Button>
          ) : null}
        </Card>
      ) : null}

      <div className="bg-card shadow-card overflow-hidden rounded-xl ring-1 ring-foreground/8 max-lg:overflow-visible max-lg:bg-transparent max-lg:shadow-none max-lg:ring-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3 max-lg:border-b-0 max-lg:px-0 max-lg:pt-0 max-lg:pb-3">
          <p className="text-[13px] font-medium">Assigned patients</p>
          <p className="text-muted-foreground text-[13px] tabular-nums">
            {knownTotals ? `${knownTotals.total} total` : "Loading…"}
          </p>
        </div>
        <DataTable
          columns={columns}
          data={patientsQuery.data?.data ?? []}
          getRowId={(patient) => patient.id}
          isLoading={patientsQuery.isLoading}
          error={patientsQuery.error}
          onRetry={() => void patientsQuery.refetch()}
          emptyMessage={
            canAssignPatient
              ? "No patients assigned yet — add one from here."
              : "No patients assigned to this doctor."
          }
          renderCard={(patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              canAssign={canAssignPatient}
              onUnassign={(target) => unassignMutation.mutateAsync(target)}
              unassignPending={unassignMutation.isPending}
            />
          )}
        />
        {meta && (patientsQuery.data?.data.length || (knownTotals?.total ?? 0) > 0) ? (
          <div className="border-t border-border/70 px-4 py-3 max-lg:border-t-0 max-lg:px-0 max-lg:pt-3 max-lg:pb-0">
            <ListPagination
              page={page}
              totalPages={knownTotals?.totalPages}
              total={knownTotals?.total}
              hasMore={meta.hasMore}
              onPageChange={gotoPage}
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
