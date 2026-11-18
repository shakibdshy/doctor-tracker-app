import type { PatientCreateInput } from "@doctor-tracker-app/db/schemas/patient";

import { apiFetch } from "@/lib/api";

/** A patient record as the envelope returns it (doctor resolved to name). */
export type Patient = {
  id: string;
  name: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  condition: string;
  doctor: { id: string; name: string } | null;
  createdAt: string;
  notes?: string;
};

export const PATIENT_PAGE_SIZE = 10;

export type PatientListQuery = {
  /** Display position; part of the cache key only, never sent. */
  page?: number;
  cursor?: string | null;
  search?: string;
  condition?: string;
  doctor?: string;
  from?: string;
  to?: string;
  limit?: number;
};

/** Filter → cursor → limit, matching the server's list grammar (ADR-0003). */
function patientsQueryString(query: PatientListQuery): string {
  const search = new URLSearchParams();
  if (query.search) search.set("search", query.search);
  if (query.condition) search.set("condition", query.condition);
  if (query.doctor) search.set("doctor", query.doctor);
  if (query.from) search.set("from", query.from);
  if (query.to) search.set("to", query.to);
  if (query.cursor) search.set("cursor", query.cursor);
  search.set("limit", String(query.limit ?? PATIENT_PAGE_SIZE));
  return search.toString();
}

export function listPatients(query: PatientListQuery) {
  return apiFetch<Patient[]>(`/api/v1/patients?${patientsQueryString(query)}`);
}

export function getPatient(id: string) {
  return apiFetch<Patient>(`/api/v1/patients/${id}`);
}

export function createPatient(payload: PatientCreateInput) {
  return apiFetch<Patient>("/api/v1/patients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePatient(id: string, payload: PatientCreateInput) {
  return apiFetch<Patient>(`/api/v1/patients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** Unassignment is a PATCH that nulls the doctor (record survives). */
export function unassignPatient(id: string) {
  return apiFetch<Patient>(`/api/v1/patients/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ doctorId: null }),
  });
}

export function deletePatient(id: string) {
  return apiFetch<{ id: string }>(`/api/v1/patients/${id}`, { method: "DELETE" });
}
