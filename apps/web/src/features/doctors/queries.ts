"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { apiErrorMessage } from "@/lib/api";

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
 * Note the singular `detail` prefix — list invalidation (`all`) does not
 * touch detail caches, matching the previous literal keys.
 */
export const doctorKeys = {
  all: ["doctors"] as const,
  list: (query: DoctorListQuery) => ["doctors", query] as const,
  options: () => ["doctors", "options"] as const,
  detail: (id: string) => ["doctor", id] as const,
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
    },
    onError: (deleteError) => {
      toast.error(apiErrorMessage(deleteError));
    },
  });
}
