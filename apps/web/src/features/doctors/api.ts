import type { DoctorCreateInput } from "@doctor-tracker-app/db/schemas/doctor";

import { apiFetch } from "@/lib/api";

/** A doctor record as the envelope returns it (string id, ISO createdAt). */
export type Doctor = {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt: string;
};

export const DOCTOR_PAGE_SIZE = 10;

export type DoctorListQuery = {
  /** Display position; part of the cache key only, never sent. */
  page?: number;
  cursor?: string | null;
  search?: string;
  specialization?: string;
  hospital?: string;
  from?: string;
  to?: string;
  limit?: number;
};

/** Filter → cursor → limit, matching the server's list grammar (ADR-0003). */
function doctorsQueryString(query: DoctorListQuery): string {
  const search = new URLSearchParams();
  if (query.search) search.set("search", query.search);
  if (query.specialization) search.set("specialization", query.specialization);
  if (query.hospital) search.set("hospital", query.hospital);
  if (query.from) search.set("from", query.from);
  if (query.to) search.set("to", query.to);
  if (query.cursor) search.set("cursor", query.cursor);
  search.set("limit", String(query.limit ?? DOCTOR_PAGE_SIZE));
  return search.toString();
}

export function listDoctors(query: DoctorListQuery) {
  return apiFetch<Doctor[]>(`/api/v1/doctors?${doctorsQueryString(query)}`);
}

/** Roster options for pickers — the roster is small enough for one capped page. */
export function listDoctorOptions() {
  return apiFetch<Doctor[]>("/api/v1/doctors?limit=100");
}

export function getDoctor(id: string) {
  return apiFetch<Doctor>(`/api/v1/doctors/${id}`);
}

export function createDoctor(values: DoctorCreateInput) {
  return apiFetch<Doctor>("/api/v1/doctors", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function updateDoctor(id: string, values: DoctorCreateInput) {
  return apiFetch<Doctor>(`/api/v1/doctors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function deleteDoctor(id: string) {
  return apiFetch<{ id: string }>(`/api/v1/doctors/${id}`, { method: "DELETE" });
}
