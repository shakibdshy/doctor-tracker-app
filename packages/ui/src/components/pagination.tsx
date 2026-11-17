"use client";

import { cn } from "@doctor-tracker-app/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "./button";

export type ListPaginationProps = {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/**
 * Bound to the list-query page meta: prev/next controls, position, and
 * total count. Prev/next are native buttons — keyboard operable by default;
 * disabled at the bounds so the page never goes out of range.
 */
function ListPagination({
  page,
  totalPages,
  total,
  onPageChange,
  className,
}: ListPaginationProps) {
  const totalLabel = `${total} ${total === 1 ? "record" : "records"}`;

  return (
    <nav
      data-slot="list-pagination"
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-2",
        className,
      )}
    >
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {totalLabel}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs tabular-nums">
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </nav>
  );
}

export { ListPagination };
