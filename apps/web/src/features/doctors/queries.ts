"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { apiErrorMessage } from "@/lib/api";
import { patientKeys } from "@/features/patients/queries";

import {
  deleteDoctor,
  getDoctor,
  listDoctorOptions,
  listDoctors,
  type Doctor,
  type DoctorListQuery,
} from "./api";

/**
 * Query-key factory: every doctors cache entry is addressed through this.
 * All keys share the `["doctors"]` root so one invalidation pass (save,
 * delete) also refreshes detail caches and the roster options pickers.
 */
export const doctorKeys = {
  all: ["doctors"] as const,
  list: (query: DoctorListQuery) => ["doctors", query] as const,
  options: () => ["doctors", "options"] as const,
  detail: (id: string) => ["doctors", "detail", id] as const,
};

export function useDoctors(query: DoctorListQuery) {
  return useQuery({
    queryKey: doctorKeys.list(query),
    queryFn: () => listDoctors(query),
    placeholderData: keepPreviousData,
  });
}

export function useDoctor(id: string) {
  return useQuery({
    queryKey: doctorKeys.detail(id),
    queryFn: () => getDoctor(id),
    retry: false,
  });
}

export function useDoctorOptions() {
  return useQuery({
    queryKey: doctorKeys.options(),
    queryFn: () => listDoctorOptions(),
  });
}

export function useDeleteDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (doctor: Doctor) => deleteDoctor(doctor.id),
    onSuccess: (_result, doctor) => {
      toast.success(`${doctor.name} deleted — their patients are now unassigned`);
      void queryClient.invalidateQueries({ queryKey: doctorKeys.all });
      // The server just unassigned all of this doctor's patients; the
      // patients caches (lists + the doctor-detail assignment lists) must
      // not keep showing them as assigned.
      void queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
    onError: (deleteError) => {
      toast.error(apiErrorMessage(deleteError));
    },
  });
}
