"use client";

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
import { SPECIALIZATIONS } from "@doctor-tracker-app/db/schemas/enums";
import Link from "next/link";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { apiErrorMessage } from "@/lib/api";
import { dateFormatter } from "@/lib/format";
import { usePermissions } from "@/hooks/use-permissions";
import { useKeysetList } from "@/hooks/use-keyset-list";

import type { Doctor, DoctorListQuery } from "../api";
import { useDeleteDoctor, useDoctors } from "../queries";
import { DoctorCard } from "./doctor-card";
import { DoctorFormDialog } from "./doctor-form-dialog";

/** URL filter keys this listing owns (search is the hook's own field). */
type DoctorFilters = Omit<DoctorListQuery, "page" | "cursor" | "search" | "limit">;
const DOCTOR_FILTER_FIELDS = [
  "specialization",
  "hospital",
  "from",
  "to",
] as const satisfies readonly (keyof DoctorFilters)[];

export default function DoctorsView({ role }: { role: string | null | undefined }) {
  // URL state, debounced search, cursor stack, totals: lib/use-keyset-list.
  const {
    params,
    setParams,
    query,
    page,
    knownTotals,
    syncPage,
    gotoPage,
    searchInput,
    setSearchInput,
    activeFilters,
  } = useKeysetList<DoctorFilters>({ fields: DOCTOR_FILTER_FIELDS });

  const { canCreateDoctor, canUpdateDoctor, canDeleteDoctor } = usePermissions(role);

  const { data, isLoading, error, refetch, isPlaceholderData } = useDoctors(query);
  const meta = !isPlaceholderData ? data?.meta : undefined;
  useEffect(() => {
    syncPage(meta);
  }, [syncPage, meta]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);

  const deleteMutation = useDeleteDoctor();

  const deleteButton = (doctor: Doctor) => (
    <ConfirmDialog
      trigger={
        <Button
          variant="destructive"
          size="icon-sm"
          aria-label={`Delete ${doctor.name}`}
        >
          <Trash2Icon />
        </Button>
      }
      title={`Delete ${doctor.name}?`}
      description="The doctor is deleted from the roster and their patients become unassigned. This cannot be undone."
      confirmLabel="Delete doctor"
      onConfirm={() => deleteMutation.mutateAsync(doctor)}
      isPending={deleteMutation.isPending}
      onError={(deleteError: unknown) => toast.error(apiErrorMessage(deleteError))}
    />
  );

  const columns = useMemo<DataTableColumn<Doctor>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: (ctx) => (
          <Link
            href={`/doctors/${ctx.row.original.id}`}
            className="font-medium underline-offset-4 hover:text-primary hover:underline"
          >
            {ctx.row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "specialization",
        header: "Specialization",
        cell: (ctx) => <Badge variant="secondary">{ctx.getValue() as string}</Badge>,
      },
      { accessorKey: "hospital", header: "Hospital" },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: (ctx) => (
          <span className="font-mono text-[13px] text-muted-foreground">
            {ctx.row.original.phone}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: (ctx) => (
          <span
            title={ctx.row.original.email}
            className="block max-w-44 truncate font-mono text-[13px] text-muted-foreground"
          >
            {ctx.row.original.email}
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
      ...(canUpdateDoctor || canDeleteDoctor
        ? [
            {
              id: "actions",
              header: "",
              cell: (ctx) => (
                <div className="flex items-center justify-end gap-1">
                  {canUpdateDoctor ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${ctx.row.original.name}`}
                      onClick={() => setEditing(ctx.row.original)}
                    >
                      <PencilIcon />
                    </Button>
                  ) : null}
                  {canDeleteDoctor ? deleteButton(ctx.row.original) : null}
                </div>
              ),
            } satisfies DataTableColumn<Doctor>,
          ]
        : []),
    ],
    [canUpdateDoctor, canDeleteDoctor, deleteMutation],
  );

  const doctors = data?.data ?? [];

  const doctorCard = (doctor: Doctor) => (
    <DoctorCard
      key={doctor.id}
      doctor={doctor}
      canUpdate={canUpdateDoctor}
      canDelete={canDeleteDoctor}
      onEdit={setEditing}
      onDelete={(target) => deleteMutation.mutateAsync(target)}
      deletePending={deleteMutation.isPending}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <FilterBar className="rounded-xl border border-border/70 bg-card/60 p-3 sm:p-4">
        <FilterField label="Search" htmlFor="doctor-search">
          <Input
            id="doctor-search"
            type="search"
            placeholder="Name, email, or hospital…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </FilterField>
        <FilterField label="Specialization" htmlFor="doctor-specialization-filter">
          <Select
            items={[{ value: "all", label: "All" }]}
            value={query.specialization ?? "all"}
            onValueChange={(value) =>
              setParams({
                specialization: value === "all" ? null : String(value),
                page: null,
                cursor: null,
              })
            }
          >
            <SelectTrigger id="doctor-specialization-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {SPECIALIZATIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Hospital" htmlFor="doctor-hospital-filter">
          <Input
            id="doctor-hospital-filter"
            placeholder="Starts with…"
            value={params.get("hospital") ?? ""}
            onChange={(event) =>
              setParams({ hospital: event.target.value || null, page: null, cursor: null })
            }
          />
        </FilterField>
        <FilterField label="From" htmlFor="doctor-from">
          <DatePicker
            id="doctor-from"
            value={params.get("from")}
            onChange={(value) => setParams({ from: value, page: null, cursor: null })}
          />
        </FilterField>
        <FilterField label="To" htmlFor="doctor-to">
          <DatePicker
            id="doctor-to"
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
                specialization: null,
                hospital: null,
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
            {knownTotals ? `${knownTotals.total} doctors` : "Loading…"}
          </p>
          {canCreateDoctor ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Add doctor
            </Button>
          ) : null}
        </div>
        <DataTable
          columns={columns}
          data={doctors}
          getRowId={(doctor) => doctor.id}
          isLoading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          emptyMessage={
            activeFilters > 0
              ? "No doctors match the current search or filters."
              : "No doctors yet — add the first one to get started."
          }
          renderCard={doctorCard}
        />
        {meta && (doctors.length > 0 || (knownTotals?.total ?? 0) > 0) ? (
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

      <DoctorFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DoctorFormDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        initial={editing}
      />
    </div>
  );
}
