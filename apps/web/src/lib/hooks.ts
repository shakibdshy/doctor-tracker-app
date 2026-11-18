"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { apiErrorMessage, apiFetch, type PageMeta, type Patient } from "@/lib/api";

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

type PatientPage = { data: Patient[]; meta?: PageMeta };

/**
 * Optimistic unassign (spec: confirmation, optimistic with rollback). The
 * row flips to the unassigned pool instantly; a failure restores the
 * previous cache and toasts. `mode` picks the list's optimistic shape:
 * "keepRow" (patients page) keeps the row with doctor cleared, "removeRow"
 * (doctor detail) drops it from the assigned list.
 */
export function useOptimisticUnassign(
  listKey: readonly unknown[],
  mode: "keepRow" | "removeRow",
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patient: Patient) =>
      apiFetch<Patient>(`/api/v1/patients/${patient.id}`, {
        method: "PATCH",
        body: JSON.stringify({ doctorId: null }),
      }),
    onMutate: async (patient: Patient) => {
      await queryClient.cancelQueries({ queryKey: [...listKey] });
      const previous = queryClient.getQueryData<PatientPage>([...listKey]);
      queryClient.setQueryData<PatientPage>([...listKey], (old) => {
        if (!old) return old;
        if (mode === "removeRow") {
          return {
            ...old,
            data: old.data.filter((row) => row.id !== patient.id),
            meta: old.meta
              ? {
                  ...old.meta,
                  total:
                    old.meta.total !== undefined ? old.meta.total - 1 : undefined,
                }
              : old.meta,
          };
        }
        return {
          ...old,
          data: old.data.map((row) =>
            row.id === patient.id ? { ...row, doctor: null } : row,
          ),
        };
      });
      return { previous };
    },
    onError: (error, patient, context) => {
      if (context?.previous) {
        queryClient.setQueryData([...listKey], context.previous);
      }
      toast.error(apiErrorMessage(error));
    },
    onSuccess: (_result, patient) => {
      toast.success(`${patient.name} unassigned — now in the unassigned pool`);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
