"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useCallback, useEffect, useState } from "react";

/** Debounce a fast-changing value (e.g. the search input) by `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * List-page state lives in the URL (refresh, back button, shareable links).
 * Pass `null` values to clear a key; callers reset `page` when filters move.
 */
export function useUrlState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      const queryString = next.toString();
      // usePathname() is a plain string; the route is ours, typed by build.
      const target = (
        queryString ? `${pathname}?${queryString}` : pathname
      ) as Route;
      router.replace(target, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  return { params: searchParams, setParams };
}
