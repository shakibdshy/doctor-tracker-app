"use client";

import { DataTable } from "@doctor-tracker-app/ui/components/data-table";
import type { DataTableColumn } from "@doctor-tracker-app/ui/components/data-table";
import { ConfirmDialog } from "@doctor-tracker-app/ui/components/confirm-dialog";
import { FilterBar, FilterField } from "@doctor-tracker-app/ui/components/filter-bar";
import { ListPagination } from "@doctor-tracker-app/ui/components/pagination";
import { Badge } from "@doctor-tracker-app/ui/components/badge";
import { Button } from "@doctor-tracker-app/ui/components/button";
import { Input } from "@doctor-tracker-app/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@doctor-tracker-app/ui/components/select";
import { Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { can } from "@doctor-tracker-app/auth/policy";

// Local sample data — this page is the design-system demonstration; the real
// roster arrives with the doctor-roster ticket (#4).
type DemoDoctor = {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  since: string;
};

const DEMO_DOCTORS: DemoDoctor[] = [
  { id: "d1", name: "Amara Osei", specialization: "Cardiology", hospital: "St. Mary General", phone: "+1 555-0101", since: "Mar 2026" },
  { id: "d2", name: "Bilal Rahman", specialization: "Neurology", hospital: "Riverside Clinic", phone: "+1 555-0102", since: "Mar 2026" },
  { id: "d3", name: "Clara Nyström", specialization: "Pediatrics", hospital: "St. Mary General", phone: "+1 555-0103", since: "Apr 2026" },
  { id: "d4", name: "Diego Fuentes", specialization: "Orthopedics", hospital: "Northside Medical", phone: "+1 555-0104", since: "Apr 2026" },
  { id: "d5", name: "Emiko Tanaka", specialization: "Dermatology", hospital: "Riverside Clinic", phone: "+1 555-0105", since: "May 2026" },
  { id: "d6", name: "Farida Haddad", specialization: "Cardiology", hospital: "Northside Medical", phone: "+1 555-0106", since: "Jun 2026" },
  { id: "d7", name: "Gabriel Mendes", specialization: "Psychiatry", hospital: "Harbor Health", phone: "+1 555-0107", since: "Jul 2026" },
  { id: "d8", name: "Hana Kovač", specialization: "Pediatrics", hospital: "Harbor Health", phone: "+1 555-0108", since: "Aug 2026" },
  { id: "d9", name: "Ibrahim Diallo", specialization: "Neurology", hospital: "St. Mary General", phone: "+1 555-0109", since: "Sep 2026" },
];

const SPECIALIZATIONS = [
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
];

const DEMO_PAGE_SIZE = 6;

type PreviewState = "data" | "loading" | "error" | "empty";

const PREVIEW_STATES: PreviewState[] = ["data", "loading", "error", "empty"];

export default function DoctorsDemo({
  role,
}: {
  role: string | null | undefined;
}) {
  const [preview, setPreview] = useState<PreviewState>("data");
  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState("all");
  const [page, setPage] = useState(1);

  const canDelete = can(role, "doctor:delete");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return DEMO_DOCTORS.filter((doctor) => {
      const matchesSearch =
        needle.length === 0 ||
        doctor.name.toLowerCase().startsWith(needle) ||
        doctor.hospital.toLowerCase().startsWith(needle);
      const matchesSpecialization =
        specialization === "all" || doctor.specialization === specialization;
      return matchesSearch && matchesSpecialization;
    });
  }, [search, specialization]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / DEMO_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * DEMO_PAGE_SIZE,
    safePage * DEMO_PAGE_SIZE,
  );

  const columns = useMemo<DataTableColumn<DemoDoctor>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: (ctx) => <span className="font-medium">{ctx.getValue() as string}</span>,
      },
      {
        accessorKey: "specialization",
        header: "Specialization",
        cell: (ctx) => <Badge variant="secondary">{ctx.getValue() as string}</Badge>,
      },
      { accessorKey: "hospital", header: "Hospital" },
      { accessorKey: "phone", header: "Phone" },
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
                  description="The doctor is deleted from the roster and their patients become unassigned. This cannot be undone."
                  confirmLabel="Delete doctor"
                  onConfirm={() => {
                    toast.success(`Delete requested for ${ctx.row.original.name} (demo)`);
                  }}
                />
              ),
            } satisfies DataTableColumn<DemoDoctor>,
          ]
        : []),
    ],
    [canDelete],
  );

  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <FilterField label="Search" htmlFor="doctor-search" className="sm:w-64">
          <Input
            id="doctor-search"
            type="search"
            placeholder="Name or hospital…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </FilterField>
        <FilterField label="Specialization" htmlFor="doctor-specialization">
          <Select
            items={[{ value: "all", label: "All specializations" }]}
            value={specialization}
            onValueChange={(value) => {
              setSpecialization(String(value));
              setPage(1);
            }}
          >
            <SelectTrigger id="doctor-specialization" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All specializations</SelectItem>
              {SPECIALIZATIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <div
          role="group"
          aria-label="Preview list states"
          className="flex items-center gap-1 sm:ml-auto"
        >
          {PREVIEW_STATES.map((state) => (
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
      </FilterBar>

      <div className="rounded-lg border bg-card">
        <DataTable
          columns={columns}
          data={pageRows}
          getRowId={(doctor) => doctor.id}
          isLoading={preview === "loading"}
          error={preview === "error" ? new Error("demo") : undefined}
          onRetry={() => setPreview("data")}
          isEmpty={preview === "empty"}
          emptyMessage="No doctors match the current search or filter."
        />
        {preview === "data" ? (
          <div className="border-t p-3">
            <ListPagination
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
