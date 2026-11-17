"use client";

import { can } from "@doctor-tracker-app/auth/policy";
import { Badge } from "@doctor-tracker-app/ui/components/badge";
import { Button } from "@doctor-tracker-app/ui/components/button";
import { Card } from "@doctor-tracker-app/ui/components/card";
import { ConfirmDialog } from "@doctor-tracker-app/ui/components/confirm-dialog";
import { DataTable } from "@doctor-tracker-app/ui/components/data-table";
import type { DataTableColumn } from "@doctor-tracker-app/ui/components/data-table";
import { DatePicker } from "@doctor-tracker-app/ui/components/date-picker";
import { FilterBar, FilterField } from "@doctor-tracker-app/ui/components/filter-bar";
import { Input } from "@doctor-tracker-app/ui/components/input";
import { ListPagination } from "@doctor-tracker-app/ui/components/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@doctor-tracker-app/ui/components/select";
import { CONDITIONS } from "@doctor-tracker-app/db/schemas/enums";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, Trash2Icon, UnlinkIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { apiFetch, apiErrorMessage, type Doctor, type PageMeta, type Patient } from "@/lib/api";
import { useDebouncedValue, useOptimisticUnassign, useUrlState } from "@/lib/hooks";
import { dateFormatter } from "@/lib/format";

import { PatientCard } from "./patient-card";
import { PatientFormDialog } from "./patient-form-dialog";

const PATIENT_PAGE_SIZE = 10;

const ANY_DOCTOR = "any";
const UNASSIGNED = "unassigned";

export default function PatientsView({ role }: { role: string | null | undefined }) {
  const { params, setParams } = useUrlState();
  const queryClient = useQueryClient();

  const canCreate = can(role, "patient:create");
  const canUpdate = can(role, "patient:update");
  const canAssign = can(role, "patient:assign");
  const canDelete = can(role, "patient:delete");

  const urlSearch = params.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  useEffect(() => {
    if (debouncedSearch !== urlSearch) {
      setParams({ search: debouncedSearch || null, page: null });
    }
  }, [debouncedSearch, urlSearch, setParams]);
  // External URL changes (Clear filters, back button) mirror into the input,
  // but never clobber in-progress typing that hasn't committed yet.
  useEffect(() => {
    if (urlSearch !== searchInput && urlSearch !== debouncedSearch) {
      setSearchInput(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

  const query = useMemo(
    () => ({
      page: Number(params.get("page") ?? 1),
      search: params.get("search") ?? undefined,
      condition: params.get("condition") ?? undefined,
      doctor: params.get("doctor") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
    }),
    [params],
  );

  const queryString = useMemo(() => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) search.set(key, String(value));
    }
    search.set("limit", String(PATIENT_PAGE_SIZE));
    return search.toString();
  }, [query]);

  // Doctor filter options: the roster is small enough for one capped page.
  const { data: doctorOptions } = useQuery({
    queryKey: ["doctors", "options"],
    queryFn: () => apiFetch<Doctor[]>("/api/v1/doctors?limit=100"),
  });
  const doctors = doctorOptions?.data ?? [];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["patients", query],
    queryFn: () => apiFetch<Patient[]>(`/api/v1/patients?${queryString}`, { method: "GET" }),
    placeholderData: keepPreviousData,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (patient: Patient) =>
      apiFetch<{ id: string }>(`/api/v1/patients/${patient.id}`, { method: "DELETE" }),
    onSuccess: (_result, patient) => {
      toast.success(`${patient.name} deleted permanently`);
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (deleteError) => {
      toast.error(apiErrorMessage(deleteError));
    },
  });

  const unassignMutation = useOptimisticUnassign(["patients", query], "keepRow");

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
        id: "doctor",
        header: "Doctor",
        cell: (ctx) =>
          ctx.row.original.doctor ? (
            ctx.row.original.doctor.name
          ) : (
            <span className="text-muted-foreground italic">Unassigned</span>
          ),
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
      ...(canUpdate || canAssign || canDelete
        ? [
            {
              id: "actions",
              header: "",
              cell: (ctx) => (
                <div className="flex items-center justify-end gap-1">
                  {canAssign && ctx.row.original.doctor ? (
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
                  ) : null}
                  {canUpdate ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${ctx.row.original.name}`}
                      onClick={() => setEditing(ctx.row.original)}
                    >
                      <PencilIcon />
                    </Button>
                  ) : null}
                  {canDelete ? (
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
                      onConfirm={() => deleteMutation.mutateAsync(ctx.row.original)}
                      isPending={deleteMutation.isPending}
                      onError={(deleteError: unknown) => toast.error(apiErrorMessage(deleteError))}
                    />
                  ) : null}
                </div>
              ),
            } satisfies DataTableColumn<Patient>,
          ]
        : []),
    ],
    [canUpdate, canAssign, canDelete, deleteMutation, unassignMutation],
  );

  const activeFilters =
    (query.search ? 1 : 0) +
    (query.condition ? 1 : 0) +
    (query.doctor ? 1 : 0) +
    (query.from || query.to ? 1 : 0);

  const meta = data?.meta;
  const patients = data?.data ?? [];

  const patientCard = (patient: Patient) => (
    <PatientCard
      key={patient.id}
      patient={patient}
      canAssign={canAssign}
      onUnassign={(target) => unassignMutation.mutateAsync(target)}
      unassignPending={unassignMutation.isPending}
      onEdit={canUpdate ? (target) => setEditing(target) : undefined}
      onDelete={canDelete ? (target) => deleteMutation.mutateAsync(target) : undefined}
      deletePending={deleteMutation.isPending}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <FilterBar className="rounded-xl border border-border/70 bg-card/60 p-3 sm:p-4 xl:grid-cols-[1.2fr_0.9fr_1.2fr_0.85fr_0.85fr_auto]">
        <FilterField label="Search" htmlFor="patient-search">
          <Input
            id="patient-search"
            type="search"
            placeholder="Name or phone…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </FilterField>
        <FilterField label="Condition" htmlFor="patient-condition-filter">
          <Select
            items={[{ value: "all", label: "All" }]}
            value={query.condition ?? "all"}
            onValueChange={(value) =>
              setParams({ condition: value === "all" ? null : String(value), page: null })
            }
          >
            <SelectTrigger id="patient-condition-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {CONDITIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Doctor" htmlFor="patient-doctor-filter">
          <Select
            items={[{ value: ANY_DOCTOR, label: "All doctors" }]}
            value={query.doctor ?? ANY_DOCTOR}
            onValueChange={(value) =>
              setParams({
                doctor:
                  value === ANY_DOCTOR ? null : value === UNASSIGNED ? UNASSIGNED : String(value),
                page: null,
              })
            }
          >
            <SelectTrigger id="patient-doctor-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_DOCTOR}>All doctors</SelectItem>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="From" htmlFor="patient-from">
          <DatePicker
            id="patient-from"
            value={params.get("from")}
            onChange={(value) => setParams({ from: value, page: null })}
          />
        </FilterField>
        <FilterField label="To" htmlFor="patient-to">
          <DatePicker
            id="patient-to"
            value={params.get("to")}
            onChange={(value) => setParams({ to: value, page: null })}
          />
        </FilterField>
        {activeFilters > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="self-end justify-self-start xl:justify-self-end"
            onClick={() =>
              setParams({
                search: null,
                condition: null,
                doctor: null,
                from: null,
                to: null,
                page: null,
              })
            }
          >
            Clear filters
          </Button>
        ) : null}
      </FilterBar>

      <div className="bg-card shadow-card overflow-hidden rounded-xl ring-1 ring-foreground/8 max-lg:overflow-visible max-lg:bg-transparent max-lg:shadow-none max-lg:ring-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3 max-lg:border-b-0 max-lg:px-0 max-lg:pt-0 max-lg:pb-3">
          <p className="text-muted-foreground text-[13px] tabular-nums">
            {meta ? `${meta.total} patients` : "Loading…"}
          </p>
          {canCreate ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Add patient
            </Button>
          ) : null}
        </div>
        <DataTable
          columns={columns}
          data={patients}
          getRowId={(patient) => patient.id}
          isLoading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          emptyMessage={
            activeFilters > 0
              ? "No patients match the current search or filters."
              : "No patients yet — add the first one to get started."
          }
          renderCard={patientCard}
        />
        {meta && meta.total > 0 ? (
          <div className="border-t border-border/70 px-4 py-3 max-lg:border-t-0 max-lg:px-0 max-lg:pt-3 max-lg:pb-0">
            <ListPagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              onPageChange={(page) => setParams({ page: page > 1 ? String(page) : null })}
            />
          </div>
        ) : null}
      </div>

      <PatientFormDialog open={createOpen} onOpenChange={setCreateOpen} doctors={doctors} />
      <PatientFormDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        initial={editing}
        doctors={doctors}
      />
    </div>
  );
}
