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
import { SPECIALIZATIONS } from "@doctor-tracker-app/db/schemas/enums";
import Link from "next/link";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { apiErrorMessage, type PageMeta } from "@/lib/api";
import { dateFormatter } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useUrlState } from "@/lib/use-url-state";

import type { Doctor } from "../api";
import { useDeleteDoctor, useDoctors } from "../queries";
import { DoctorCard } from "./doctor-card";
import { DoctorFormDialog } from "./doctor-form-dialog";

export default function DoctorsView({ role }: { role: string | null | undefined }) {
  const { params, setParams } = useUrlState();

  const canCreate = can(role, "doctor:create");
  const canUpdate = can(role, "doctor:update");
  const canDelete = can(role, "doctor:delete");

  // The search input is local and debounced; every other filter lives in the URL.
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
  // the 1-based position the pager displays. Each visited page's cursor is
  // remembered in a stack for Previous to walk back; the stack clears when a
  // filter changes because cursors are only valid within one filter context.
  const pageParam = Number(params.get("page") ?? 1);
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;
  const cursor = params.get("cursor") ?? undefined;

  const query = useMemo(
    () => ({
      page,
      cursor,
      search: params.get("search") ?? undefined,
      specialization: params.get("specialization") ?? undefined,
      hospital: params.get("hospital") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
    }),
    [params, page, cursor],
  );

  const { data, isLoading, error, refetch, isPlaceholderData } = useDoctors(query);

  // Totals ride only the first page (cursor pages skip the count); keep the
  // last known values so the header and pager don't flicker while paging.
  const [knownTotals, setKnownTotals] = useState<{ total: number; totalPages: number } | null>(
    null,
  );

  const cursorsRef = useRef(new Map<number, string | null>());

  const meta: PageMeta | undefined = !isPlaceholderData ? data?.meta : undefined;
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
    query.specialization,
    query.hospital,
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
      ...(canUpdate || canDelete
        ? [
            {
              id: "actions",
              header: "",
              cell: (ctx) => (
                <div className="flex items-center justify-end gap-1">
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
                  {canDelete ? deleteButton(ctx.row.original) : null}
                </div>
              ),
            } satisfies DataTableColumn<Doctor>,
          ]
        : []),
    ],
    [canUpdate, canDelete, deleteMutation],
  );

  const activeFilters =
    (query.search ? 1 : 0) +
    (query.specialization ? 1 : 0) +
    (query.hospital ? 1 : 0) +
    (query.from || query.to ? 1 : 0);

  const doctors = data?.data ?? [];

  /** Walk to a page via its remembered cursor (page 1 carries none). */
  const gotoPage = (target: number) => {
    const clamped = Math.max(1, target);
    if (clamped === page) return;
    setParams({
      page: clamped > 1 ? String(clamped) : null,
      cursor: cursorsRef.current.get(clamped) ?? null,
    });
  };

  const doctorCard = (doctor: Doctor) => (
    <DoctorCard
      key={doctor.id}
      doctor={doctor}
      canUpdate={canUpdate}
      canDelete={canDelete}
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
          {canCreate ? (
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
