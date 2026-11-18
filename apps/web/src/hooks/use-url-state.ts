"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useCallback, useEffect, useRef } from "react";

/**
 * List-page state lives in the URL (refresh, back button, shareable links).
 * Pass `null` values to clear a key; callers reset `page` when filters move.
 */
export function useUrlState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Successive setParams calls in one tick (e.g. From then To) must compose:
  // the searchParams snapshot lags behind router.replace, so keep the latest
  // written query in a ref and resync when the URL actually changes.
  const latestQuery = useRef(searchParams.toString());
  useEffect(() => {
    latestQuery.current = searchParams.toString();
  }, [searchParams]);

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(latestQuery.current);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      const queryString = next.toString();
      latestQuery.current = queryString;
      // usePathname() is a plain string; the route is ours, typed by build.
      const target = (
        queryString ? `${pathname}?${queryString}` : pathname
      ) as Route;
      router.replace(target, { scroll: false });
    },
    [router, pathname],
  );

  return { params: searchParams, setParams };
}
