"use client";

import { can } from "@doctor-tracker-app/auth/policy";
import { Badge } from "@doctor-tracker-app/ui/components/badge";
import { Button } from "@doctor-tracker-app/ui/components/button";
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
import { PencilIcon, PlusIcon, Trash2Icon, UnlinkIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { Doctor } from "@/features/doctors/api";
import { useDoctorOptions } from "@/features/doctors/queries";
import { apiErrorMessage, type PageMeta } from "@/lib/api";
import { dateFormatter } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useUrlState } from "@/lib/use-url-state";

import type { Patient } from "../api";
import {
  patientKeys,
  useDeletePatient,
  useOptimisticUnassign,
  usePatients,
} from "../queries";
import { PatientCard } from "./patient-card";
import { PatientFormDialog } from "./patient-form-dialog";

const ANY_DOCTOR = "any";
const UNASSIGNED = "unassigned";

export default function PatientsView({ role }: { role: string | null | undefined }) {
  const { params, setParams } = useUrlState();

  const canCreate = can(role, "patient:create");
  const canUpdate = can(role, "patient:update");
  const canAssign = can(role, "patient:assign");
  const canDelete = can(role, "patient:delete");

  const urlSearch = params.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  useEffect(() => {
    if (debouncedSearch !== urlSearch) {
      setParams({ search: debouncedSearch || null, page: null, cursor: null });
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

  // Keyset pagination (ADR-0003): `cursor` drives the API request, `page` is
  // the 1-based position the pager displays. The server only returns the
  // forward token, so each visited page's cursor is remembered in a stack for
  // Previous to walk back; refresh loses the stack and Previous lands on
  // page 1. Cursors are only valid within one filter context, so the stack
  // clears when a filter changes.
  const pageParam = Number(params.get("page") ?? 1);
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;
  const cursor = params.get("cursor") ?? undefined;

  const query = useMemo(
    () => ({
      page,
      cursor,
      search: params.get("search") ?? undefined,
      condition: params.get("condition") ?? undefined,
      doctor: params.get("doctor") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
    }),
    [params, page, cursor],
  );

  // Doctor filter options: the roster is small enough for one capped page.
  const { data: doctorOptions } = useDoctorOptions();
  const doctors = doctorOptions?.data ?? [];

  const { data, isLoading, error, refetch, isPlaceholderData } = usePatients(query);

  // Totals ride only the first page (cursor pages skip the count); keep the
  // last known values so the header and pager don't flicker while paging.
  const [knownTotals, setKnownTotals] = useState<{ total: number; totalPages: number } | null>(
    null,
  );

  const cursorsRef = useRef(new Map<number, string | null>());

  const meta = !isPlaceholderData ? data?.meta : undefined;
  useEffect(() => {
    if (meta?.total !== undefined) {
      setKnownTotals({ total: meta.total, totalPages: meta.totalPages ?? 1 });
    }
  }, [meta]);

  // Record each visited page's own cursor plus the forward cursor its
  // response hands out, so Previous/Next always fetch the page they show.
  useEffect(() => {
    cursorsRef.current.set(page, cursor ?? null);
    if (meta?.nextCursor) cursorsRef.current.set(page + 1, meta.nextCursor);
  }, [page, cursor, meta]);
  // A new filter context invalidates every stored cursor.
  const filterKey = [
    query.search,
    query.condition,
    query.doctor,
    query.from,
    query.to,
  ].join("|");
  useEffect(() => {
    cursorsRef.current.clear();
    cursorsRef.current.set(page, cursor ?? null);
    // filterKey is derived from exactly the fields that invalidate cursors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);

  const deleteMutation = useDeletePatient();

  const unassignMutation = useOptimisticUnassign(patientKeys.list(query), "keepRow");

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

  const patients = data?.data ?? [];

  /** Walk to a page via its remembered cursor (page 1 carries none). */
  const gotoPage = (target: number) => {
    const clamped = Math.max(1, target);
    if (clamped === page) return;
    setParams({
      page: clamped > 1 ? String(clamped) : null,
      cursor: cursorsRef.current.get(clamped) ?? null,
    });
  };

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
              setParams({ condition: value === "all" ? null : String(value), page: null, cursor: null })
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
                cursor: null,
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
            onChange={(value) => setParams({ from: value, page: null, cursor: null })}
          />
        </FilterField>
        <FilterField label="To" htmlFor="patient-to">
          <DatePicker
            id="patient-to"
            value={params.get("to")}
            onChange={(value) => setParams({ to: value, page: null, cursor: null })}
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
                cursor: null,
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
            {knownTotals ? `${knownTotals.total} patients` : "Loading…"}
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
        {meta && (patients.length > 0 || (knownTotals?.total ?? 0) > 0) ? (
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
