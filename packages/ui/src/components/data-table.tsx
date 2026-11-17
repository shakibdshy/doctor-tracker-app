"use client";

import { cn } from "@doctor-tracker-app/ui/lib/utils";
import {
  coreFeatures,
  createCoreRowModel,
  flexRender,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { CircleAlertIcon, InboxIcon, RefreshCcwIcon } from "lucide-react";
import * as React from "react";

import { Button } from "./button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty";
import { Skeleton } from "./skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

/**
 * Core-only feature set: portal lists are paginated, filtered, and sorted
 * by the API, so the client table renders rows without local models.
 */
const dataTableFeatures = tableFeatures({
  ...coreFeatures,
  coreRowModel: createCoreRowModel(),
});

export type DataTableFeatures = typeof dataTableFeatures;

export type DataTableColumn<TData extends RowData, TValue = unknown> = ColumnDef<
  DataTableFeatures,
  TData,
  TValue
>;

const SKELETON_ROW_COUNT = 6;

/** Full-area skeleton shown while a list query is in flight. */
function DataTableSkeleton({ columnCount }: { columnCount: number }) {
  return (
    // The skeleton is decorative; the status region announces the loading.
    <div role="status" aria-label="Loading records">
      <p className="sr-only">Loading records…</p>
      <Table aria-hidden>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columnCount }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-3.5 w-20 max-w-full" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, row) => (
            <TableRow key={row}>
              {Array.from({ length: columnCount }).map((_, col) => (
                <TableCell key={col}>
                  <Skeleton
                    className="h-3.5 max-w-full"
                    // Varied widths so the loading shape resembles real rows.
                    style={{ width: `${58 + ((row * 13 + col * 27) % 34)}%` }}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Full-area failure with a retry affordance. `onRetry` drives recovery. */
function DataTableError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Empty className="border" role="alert">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <CircleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <p className="text-muted-foreground text-sm">
          {message ?? "The list could not be loaded."}
        </p>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCcwIcon data-icon="inline-start" />
            Retry
          </Button>
        ) : null}
      </EmptyHeader>
    </Empty>
  );
}

/** Full-area empty result with guidance. */
function DataTableEmpty({ message }: { message?: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>Nothing here yet</EmptyTitle>
        <p className="text-muted-foreground text-sm">
          {message ?? "No records match the current view."}
        </p>
      </EmptyHeader>
    </Empty>
  );
}

export type DataTableStateProps = {
  /** Rows are being fetched; renders the skeleton. */
  isLoading?: boolean;
  /** Fetch failed; renders the error state instead of the table. */
  error?: unknown;
  /** Enables the retry affordance in the error state. */
  onRetry?: () => void;
  /** Set when the query succeeded with zero rows. */
  isEmpty?: boolean;
  /** Copy for the empty state (e.g. "No doctors match this filter"). */
  emptyMessage?: string;
  /** Copy for the error state. */
  errorMessage?: string;
};

type DataTableProps<TData extends RowData> = DataTableStateProps & {
  columns: DataTableColumn<TData>[];
  data: TData[];
  /** Stable identity for rows (defaults to index). */
  getRowId?: (row: TData, index: number) => string;
  className?: string;
  onRowClick?: (row: TData) => void;
  /**
   * Mobile-first card rendering: when provided, rows below the `md`
   * breakpoint render as cards instead of the horizontally scrolling table.
   */
  renderCard?: (row: TData) => React.ReactNode;
};

/**
 * The shared list table for the portal: TanStack Table rendering over
 * shadcn primitives with the skeleton / empty / error-with-retry patterns
 * built in. Without a card renderer, narrow viewports scroll horizontally
 * (the table primitive's container owns the overflow).
 */
function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  className,
  onRowClick,
  renderCard,
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyMessage,
  errorMessage,
}: DataTableProps<TData>) {
  const table = useTable<DataTableFeatures, TData>({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
  });

  if (error) {
    return <DataTableError message={errorMessage} onRetry={onRetry} />;
  }
  if (isLoading) {
    return <DataTableSkeleton columnCount={columns.length} />;
  }

  const rows = table.getRowModel().rows;
  if (isEmpty || rows.length === 0) {
    return <DataTableEmpty message={emptyMessage} />;
  }

  const tableMarkup = (
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const interactive = Boolean(onRowClick);
            return (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
                tabIndex={interactive ? 0 : undefined}
                className={cn(interactive && "cursor-pointer")}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
  );

  return (
    <div className={cn("w-full", className)}>
      {renderCard ? (
        <>
          <div className="hidden md:block">{tableMarkup}</div>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <React.Fragment key={row.id}>
                {renderCard(row.original)}
              </React.Fragment>
            ))}
          </div>
        </>
      ) : (
        tableMarkup
      )}
    </div>
  );
}

export { DataTable, DataTableEmpty, DataTableError, DataTableSkeleton };
