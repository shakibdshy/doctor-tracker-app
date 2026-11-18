"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PageMeta } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useUrlState } from "@/lib/use-url-state";

const SEARCH_DEBOUNCE_MS = 300;

type KeysetFilters = Record<string, string | undefined>;

/**
 * Shared list-page state for the URL-backed keyset listings (ADR-0003):
 * debounced search mirroring, page/cursor URL params with a per-page
 * cursor stack, last-known totals, and the active-filter count — the
 * machinery every filterable list page needs, with none of the domain.
 *
 * The listing builds its API request from `query` and feeds the response's
 * `meta` back through `syncPage` whenever the query result changes (never
 * while placeholder data is showing, so totals and the cursor stack only
 * ever learn from real pages).
 */
export function useKeysetList<F extends KeysetFilters>(options: {
  /** Non-search URL filter keys, e.g. ["condition", "doctor", "from", "to"]. Their order defines the cursor-invalidating filter key. Must be a stable (module-level) array. */
  fields: readonly (keyof F & string)[];
}) {
  const { fields } = options;
  const { params, setParams } = useUrlState();

  // The search input is local and debounced; every other filter lives in the URL.
  const urlSearch = params.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
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

  const query = useMemo(() => {
    const filters: KeysetFilters = {};
    for (const field of fields) {
      filters[field] = params.get(field) ?? undefined;
    }
    // The fields array enumerates exactly F's keys, so the spread fills them all.
    return { page, cursor, search: urlSearch || undefined, ...filters } as KeysetListQuery<F>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, page, cursor, fields]);

  // Totals ride only the first page (cursor pages skip the count); keep the
  // last known values so the header and pager don't flicker while paging.
  const [knownTotals, setKnownTotals] = useState<{ total: number; totalPages: number } | null>(
    null,
  );

  const cursorsRef = useRef(new Map<number, string | null>());

  /** Learn from a fetched page: its totals and both cursors it implies. */
  const syncPage = useCallback(
    (meta: PageMeta | undefined) => {
      if (meta?.total !== undefined) {
        setKnownTotals({ total: meta.total, totalPages: meta.totalPages ?? 1 });
      }
      cursorsRef.current.set(page, cursor ?? null);
      if (meta?.nextCursor) cursorsRef.current.set(page + 1, meta.nextCursor);
    },
    [page, cursor],
  );

  // A new filter context invalidates every stored cursor.
  const filterKey = [urlSearch || undefined, ...fields.map((f) => params.get(f) ?? undefined)].join(
    "|",
  );
  useEffect(() => {
    cursorsRef.current.clear();
    cursorsRef.current.set(page, cursor ?? null);
    // filterKey is derived from exactly the fields that invalidate cursors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  /** Walk to a page via its remembered cursor (page 1 carries none). */
  const gotoPage = useCallback(
    (target: number) => {
      const clamped = Math.max(1, target);
      if (clamped === page) return;
      setParams({
        page: clamped > 1 ? String(clamped) : null,
        cursor: cursorsRef.current.get(clamped) ?? null,
      });
    },
    [page, setParams],
  );

  // From/to form one date-range chip, so they count together.
  const activeFilters = useMemo(() => {
    let count = query.search ? 1 : 0;
    let rangeCounted = false;
    for (const field of fields) {
      if (!query[field]) continue;
      if (field === "from" || field === "to") {
        if (!rangeCounted) {
          count += 1;
          rangeCounted = true;
        }
        continue;
      }
      count += 1;
    }
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, fields]);

  return {
    params,
    setParams,
    query,
    page,
    cursor,
    knownTotals,
    syncPage,
    gotoPage,
    searchInput,
    setSearchInput,
    activeFilters,
  };
}

export type KeysetListQuery<F extends KeysetFilters> = {
  page: number;
  cursor: string | undefined;
  search: string | undefined;
} & F;
