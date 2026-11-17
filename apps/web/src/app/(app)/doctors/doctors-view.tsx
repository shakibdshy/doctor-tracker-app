"use client";

import { can } from "@doctor-tracker-app/auth/policy";
import { Badge } from "@doctor-tracker-app/ui/components/badge";
import { Button } from "@doctor-tracker-app/ui/components/button";
import { Card } from "@doctor-tracker-app/ui/components/card";
import { ConfirmDialog } from "@doctor-tracker-app/ui/components/confirm-dialog";
import { DataTable } from "@doctor-tracker-app/ui/components/data-table";
import type { DataTableColumn } from "@doctor-tracker-app/ui/components/data-table";
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
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ApiError, apiFetch, type Doctor, type PageMeta } from "@/lib/api";
import { useDebouncedValue, useUrlState } from "@/lib/hooks";

import { DoctorFormDialog } from "./doctor-form-dialog";

function apiErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

/** Deterministic date rendering — no SSR/client timezone mismatch. */
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  timeZone: "UTC",
});

const DOCTOR_PAGE_SIZE = 10;

export default function DoctorsView({ role }: { role: string | null | undefined }) {
  const { params, setParams } = useUrlState();
  const queryClient = useQueryClient();

  const canCreate = can(role, "doctor:create");
  const canUpdate = can(role, "doctor:update");
  const canDelete = can(role, "doctor:delete");

  // The search input is local and debounced; every other filter lives in the URL.
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
      specialization: params.get("specialization") ?? undefined,
      hospital: params.get("hospital") ?? undefined,
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
    search.set("limit", String(DOCTOR_PAGE_SIZE));
    return search.toString();
  }, [query]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["doctors", query],
    queryFn: () =>
      apiFetch<Doctor[]>(`/api/v1/doctors?${queryString}`, { method: "GET" }),
    placeholderData: keepPreviousData,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (doctor: Doctor) =>
      apiFetch<{ id: string }>(`/api/v1/doctors/${doctor.id}`, { method: "DELETE" }),
    onSuccess: (_result, doctor) => {
      toast.success(`${doctor.name} deleted — their patients are now unassigned`);
      void queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: (deleteError) => {
      toast.error(apiErrorMessage(deleteError));
    },
  });

  const deleteButton = (doctor: Doctor, withLabel = false) => (
    <ConfirmDialog
      trigger={
        withLabel ? (
          <Button variant="destructive" size="sm">
            <Trash2Icon data-icon="inline-start" />
            Delete
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="icon-sm"
            aria-label={`Delete ${doctor.name}`}
          >
            <Trash2Icon />
          </Button>
        )
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
        cell: (ctx) => <span className="font-medium">{ctx.row.original.name}</span>,
      },
      {
        accessorKey: "specialization",
        header: "Specialization",
        cell: (ctx) => <Badge variant="secondary">{ctx.getValue() as string}</Badge>,
      },
      { accessorKey: "hospital", header: "Hospital" },
      { accessorKey: "phone", header: "Phone" },
      { accessorKey: "email", header: "Email" },
      {
        accessorKey: "createdAt",
        header: "Added",
        cell: (ctx) => (
          <span className="text-muted-foreground tabular-nums">
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

  const meta: PageMeta | undefined = data?.meta;
  const doctors = data?.data ?? [];

  const doctorCard = (doctor: Doctor) => (
    <Card key={doctor.id} className="gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-medium">{doctor.name}</span>
          <p className="text-muted-foreground truncate text-sm">{doctor.hospital}</p>
        </div>
        <Badge variant="secondary">{doctor.specialization}</Badge>
      </div>
      <div className="text-muted-foreground text-sm">
        <p>{doctor.phone}</p>
        <p className="truncate">{doctor.email}</p>
        <p className="tabular-nums">Added {dateFormatter.format(new Date(doctor.createdAt))}</p>
      </div>
      {canUpdate || canDelete ? (
        <div className="flex items-center justify-end gap-1 border-t pt-2">
          {canUpdate ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(doctor)}
            >
              <PencilIcon data-icon="inline-start" />
              Edit
            </Button>
          ) : null}
          {canDelete ? deleteButton(doctor, true) : null}
        </div>
      ) : null}
    </Card>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {meta ? `${meta.total} doctors` : "Loading…"}
        </p>
        {canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add doctor
          </Button>
        ) : null}
      </div>

      <FilterBar>
        <FilterField label="Search" htmlFor="doctor-search" className="sm:w-64">
          <Input
            id="doctor-search"
            type="search"
            placeholder="Name, email, or hospital…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </FilterField>
        <FilterField label="Specialization" htmlFor="doctor-specialization">
          <Select
            items={[{ value: "all", label: "All" }]}
            value={query.specialization ?? "all"}
            onValueChange={(value) =>
              setParams({
                specialization: value === "all" ? null : String(value),
                page: null,
              })
            }
          >
            <SelectTrigger id="doctor-specialization" className="w-44">
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
        <FilterField label="Hospital" htmlFor="doctor-hospital-filter" className="sm:w-48">
          <Input
            id="doctor-hospital-filter"
            placeholder="Starts with…"
            value={params.get("hospital") ?? ""}
            onChange={(event) =>
              setParams({ hospital: event.target.value || null, page: null })
            }
          />
        </FilterField>
        <FilterField label="From" htmlFor="doctor-from">
          <Input
            id="doctor-from"
            type="date"
            value={params.get("from") ?? ""}
            onChange={(event) =>
              setParams({ from: event.target.value || null, page: null })
            }
          />
        </FilterField>
        <FilterField label="To" htmlFor="doctor-to">
          <Input
            id="doctor-to"
            type="date"
            value={params.get("to") ?? ""}
            onChange={(event) => setParams({ to: event.target.value || null, page: null })}
          />
        </FilterField>
        {activeFilters > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setParams({
                search: null,
                specialization: null,
                hospital: null,
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

      <div className="rounded-lg border bg-card p-2">
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
        {meta && meta.total > 0 ? (
          <div className="border-t p-3">
            <ListPagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              onPageChange={(page) => setParams({ page: page > 1 ? String(page) : null })}
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
