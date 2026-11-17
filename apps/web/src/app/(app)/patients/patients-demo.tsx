"use client";

import { DataTable } from "@doctor-tracker-app/ui/components/data-table";
import type { DataTableColumn } from "@doctor-tracker-app/ui/components/data-table";
import { ConfirmDialog } from "@doctor-tracker-app/ui/components/confirm-dialog";
import { ListPagination } from "@doctor-tracker-app/ui/components/pagination";
import { Badge } from "@doctor-tracker-app/ui/components/badge";
import { Button } from "@doctor-tracker-app/ui/components/button";
import { Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { can } from "@doctor-tracker-app/auth/policy";

// Local sample data — the real patient population arrives with the patients
// ticket (#5).
type DemoPatient = {
  id: string;
  name: string;
  gender: "female" | "male";
  condition: string;
  doctor: string | null;
  since: string;
};

const DEMO_PATIENTS: DemoPatient[] = [
  { id: "p1", name: "Aiko Yamamoto", gender: "female", condition: "Hypertension", doctor: "Amara Osei", since: "Mar 2026" },
  { id: "p2", name: "Bram de Vries", gender: "male", condition: "Type 2 Diabetes", doctor: "Farida Haddad", since: "Mar 2026" },
  { id: "p3", name: "Chidi Eze", gender: "male", condition: "Asthma", doctor: null, since: "Apr 2026" },
  { id: "p4", name: "Dalia Kotb", gender: "female", condition: "Migraine", doctor: "Bilal Rahman", since: "Apr 2026" },
  { id: "p5", name: "Eero Saarinen", gender: "male", condition: "Arthritis", doctor: "Diego Fuentes", since: "May 2026" },
  { id: "p6", name: "Fatou Ndiaye", gender: "female", condition: "Eczema", doctor: "Emiko Tanaka", since: "Jun 2026" },
  { id: "p7", name: "Gustav Lindqvist", gender: "male", condition: "Hypertension", doctor: null, since: "Jul 2026" },
  { id: "p8", name: "Hana Suzuki", gender: "female", condition: "Anxiety", doctor: "Gabriel Mendes", since: "Aug 2026" },
];

const DEMO_PAGE_SIZE = 6;

type PreviewState = "data" | "loading" | "error" | "empty";

export default function PatientsDemo({
  role,
}: {
  role: string | null | undefined;
}) {
  const [preview, setPreview] = useState<PreviewState>("data");
  const [page, setPage] = useState(1);

  const canDelete = can(role, "patient:delete");

  const totalPages = Math.max(1, Math.ceil(DEMO_PATIENTS.length / DEMO_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = DEMO_PATIENTS.slice(
    (safePage - 1) * DEMO_PAGE_SIZE,
    safePage * DEMO_PAGE_SIZE,
  );

  const columns = useMemo<DataTableColumn<DemoPatient>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Patient",
        cell: (ctx) => <span className="font-medium">{ctx.getValue() as string}</span>,
      },
      {
        accessorKey: "gender",
        header: "Gender",
        cell: (ctx) => (
          <span className="capitalize text-muted-foreground">
            {ctx.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "condition",
        header: "Condition",
        cell: (ctx) => <Badge variant="outline">{ctx.getValue() as string}</Badge>,
      },
      {
        accessorKey: "doctor",
        header: "Doctor",
        cell: (ctx) =>
          ctx.row.original.doctor ? (
            ctx.row.original.doctor
          ) : (
            <span className="text-muted-foreground italic">Unassigned</span>
          ),
      },
      { accessorKey: "since", header: "Since" },
      ...(canDelete
        ? [
            {
              id: "actions",
              header: "",
              cell: (ctx) => (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      aria-label={`Delete ${ctx.row.original.name}`}
                    >
                      <Trash2Icon />
                    </Button>
                  }
                  title={`Delete ${ctx.row.original.name}?`}
                  description="The patient record is permanently deleted. To keep the record, unassign instead."
                  confirmLabel="Delete patient"
                  onConfirm={() => {
                    toast.success(`Delete requested for ${ctx.row.original.name} (demo)`);
                  }}
                />
              ),
            } satisfies DataTableColumn<DemoPatient>,
          ]
        : []),
    ],
    [canDelete],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1" role="group" aria-label="Preview list states">
        {(["data", "loading", "error", "empty"] as PreviewState[]).map((state) => (
          <Button
            key={state}
            variant="ghost"
            size="sm"
            aria-pressed={preview === state}
            onClick={() => setPreview(state)}
          >
            {state === "data" ? "Data" : state[0].toUpperCase() + state.slice(1)}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        <DataTable
          columns={columns}
          data={pageRows}
          getRowId={(patient) => patient.id}
          isLoading={preview === "loading"}
          error={preview === "error" ? new Error("demo") : undefined}
          onRetry={() => setPreview("data")}
          isEmpty={preview === "empty"}
          emptyMessage="No patients match the current search or filter."
        />
        {preview === "data" ? (
          <div className="border-t p-3">
            <ListPagination
              page={safePage}
              totalPages={totalPages}
              total={DEMO_PATIENTS.length}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
