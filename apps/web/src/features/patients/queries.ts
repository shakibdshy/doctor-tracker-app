"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { apiErrorMessage, type PageMeta } from "@/lib/api";

import {
  deletePatient,
  getPatient,
  listPatients,
  unassignPatient,
  type Patient,
  type PatientListQuery,
} from "./api";

/**
 * Query-key factory: every patients cache entry is addressed through this.
 * Note the singular `detail` prefix — the API's keyset-list invalidation
 * (`all`) does not touch detail caches, matching the previous literal keys.
 */
export const patientKeys = {
  all: ["patients"] as const,
  list: (query: PatientListQuery) => ["patients", query] as const,
  detail: (id: string | undefined) => ["patient", id] as const,
};

type PatientPage = { data: Patient[]; meta?: PageMeta };

export function usePatients(query: PatientListQuery) {
  return useQuery({
    queryKey: patientKeys.list(query),
    queryFn: () => listPatients(query),
    placeholderData: keepPreviousData,
  });
}

export function usePatient(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => getPatient(id as string),
    enabled: options?.enabled ?? Boolean(id),
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patient: Patient) => deletePatient(patient.id),
    onSuccess: (_result, patient) => {
      toast.success(`${patient.name} deleted permanently`);
      void queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
    onError: (deleteError) => {
      toast.error(apiErrorMessage(deleteError));
    },
  });
}

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
    mutationFn: (patient: Patient) => unassignPatient(patient.id),
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
      void queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
}
