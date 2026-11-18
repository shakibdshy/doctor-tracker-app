"use client";

import { cn } from "@doctor-tracker-app/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "./button";

export type ListPaginationProps = {
  /** 1-based position, tracked client-side across cursor pages (ADR-0003). */
  page: number;
  /** Record totals — only known from the listing's first page. */
  total?: number;
  totalPages?: number;
  /** Whether a further page exists; caps Next regardless of `page`. */
  hasMore: boolean;
  onPageChange: (page: number) => void;
  className?: string;
};

/**
 * Bound to the keyset list meta: prev/next controls and position. Prev/next
 * are native buttons — keyboard operable by default; disabled at the bounds
 * so the page never goes out of range. "of N" renders only while the first
 * page's totals are in hand.
 */
function ListPagination({
  page,
  total,
  totalPages,
  hasMore,
  onPageChange,
  className,
}: ListPaginationProps) {
  const totalLabel =
    total !== undefined ? `${total} ${total === 1 ? "record" : "records"}` : "Records";

  return (
    <nav
      data-slot="list-pagination"
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-2",
        className,
      )}
    >
      <p className="text-muted-foreground text-[13px] tabular-nums" aria-live="polite">
        {totalLabel}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-[13px] tabular-nums">
          Page {page}
          {totalPages !== undefined ? ` of ${totalPages}` : ""}
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
            disabled={!hasMore}
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
