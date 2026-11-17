import { Doctor } from "@doctor-tracker-app/db/models/doctor.model";
import { Patient } from "@doctor-tracker-app/db/models/patient.model";
import type {
  PatientCreateInput,
  PatientListQuery,
  PatientUpdateInput,
} from "@doctor-tracker-app/db/schemas/patient";
import { exclusiveTo } from "@doctor-tracker-app/db/schemas/shared";
import { Types } from "mongoose";

import { AppError } from "../../http/errors";
import type { PageMeta } from "../../http/envelope";

/** The fields the list tables render; doctor resolved to { id, name }. */
const LIST_PROJECTION = "name phone gender dateOfBirth condition doctor notes createdAt";

export type AssignedDoctor = { id: string; name: string };

export type PatientListItem = {
  id: string;
  name: string;
  phone: string;
  gender: string;
  dateOfBirth: Date;
  condition: string;
  doctor: AssignedDoctor | null;
  createdAt: Date;
};

export type PatientDetail = PatientListItem & { notes?: string };

/** ADR-0001: anchored, case-sensitive prefix regex over lowercase shadows. */
function prefixPattern(input: string): RegExp {
  const escaped = input.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}`);
}

function shadowFields(input: { name: string; phone: string }) {
  return {
    nameLower: input.name.toLowerCase(),
    phoneLower: input.phone.toLowerCase(),
  };
}

/** The raw record shape toItem consumes, with the doctor populated. */
type PatientRecord = {
  _id: { toString(): string };
  name: string;
  phone: string;
  gender: string;
  dateOfBirth: Date;
  condition: string;
  doctor?: { _id: { toString(): string }; name: string } | null;
  createdAt: Date;
};

function toItem(raw: PatientRecord): PatientListItem {
  return {
    id: raw._id.toString(),
    name: raw.name,
    phone: raw.phone,
    gender: raw.gender,
    dateOfBirth: raw.dateOfBirth,
    condition: raw.condition,
    doctor: raw.doctor
      ? { id: raw.doctor._id.toString(), name: raw.doctor.name }
      : null,
    createdAt: raw.createdAt,
  };
}

export async function listPatients(
  query: PatientListQuery,
): Promise<{ data: PatientListItem[]; meta: PageMeta }> {
  const conditions: Record<string, unknown>[] = [];
  if (query.search) {
    const pattern = prefixPattern(query.search);
    conditions.push({ $or: [{ nameLower: pattern }, { phoneLower: pattern }] });
  }
  if (query.condition) conditions.push({ condition: query.condition });
  if (query.doctor === "unassigned") {
    conditions.push({ doctor: null });
  } else if (query.doctor) {
    conditions.push({ doctor: new Types.ObjectId(query.doctor) });
  }

  const createdAtRange = exclusiveTo(query);
  if (Object.keys(createdAtRange).length > 0) conditions.push({ createdAt: createdAtRange });

  const filter =
    conditions.length > 1 ? { $and: conditions } : (conditions[0] ?? {});

  // The single cast adapts the plain filter to the driver's mapped generics.
  const [docs, total] = await Promise.all([
    Patient.find(filter as never)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .select(LIST_PROJECTION)
      .populate("doctor", "name")
      .lean(),
    Patient.countDocuments(filter as never),
  ]);

  return {
    data: docs.map((doc) => toItem(doc as unknown as PatientRecord)),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getPatient(id: string): Promise<PatientDetail> {
  const patient = await Patient.findById(id)
    .select(LIST_PROJECTION)
    .populate("doctor", "name")
    .lean();
  if (!patient) throw AppError.notFound("Patient not found");
  const item = toItem(patient as unknown as PatientRecord);
  return { ...item, notes: (patient as unknown as { notes?: string }).notes };
}

/** Ensure the optional assignment points at a real doctor. */
async function requireDoctorExists(doctorId: string): Promise<void> {
  const exists = await Doctor.exists({ _id: new Types.ObjectId(doctorId) });
  if (!exists) throw AppError.notFound("Doctor not found");
}

export async function createPatient(input: PatientCreateInput): Promise<PatientDetail> {
  if (input.doctorId) {
    await requireDoctorExists(input.doctorId);
  }
  const patient = await Patient.create({
    ...input,
    doctor: input.doctorId ? new Types.ObjectId(input.doctorId) : null,
    ...shadowFields(input),
  });
  return getPatient(patient._id.toString());
}

export async function updatePatient(
  id: string,
  input: PatientUpdateInput,
): Promise<PatientDetail> {
  const patient = await Patient.findById(id);
  if (!patient) throw AppError.notFound("Patient not found");

  // Reassignment/unassignment is keyed by field presence, not value:
  // `doctorId: null` unassigns, `doctorId: "<id>"` reassigns, absent = untouched.
  if (Object.hasOwn(input, "doctorId")) {
    if (input.doctorId) {
      await requireDoctorExists(input.doctorId);
      patient.doctor = new Types.ObjectId(input.doctorId);
    } else {
      patient.doctor = null;
    }
  }
  if (input.name !== undefined) patient.name = input.name;
  if (input.phone !== undefined) patient.phone = input.phone;
  if (input.gender !== undefined) patient.gender = input.gender;
  if (input.dateOfBirth !== undefined) patient.dateOfBirth = input.dateOfBirth;
  if (input.condition !== undefined) patient.condition = input.condition;
  if (input.notes !== undefined) patient.notes = input.notes;
  Object.assign(patient, shadowFields({ name: patient.name, phone: patient.phone }));

  await patient.save();
  return getPatient(patient._id.toString());
}

/** Delete (GLOSSARY.md): permanent removal — Admin-only via route capability. */
export async function deletePatient(id: string): Promise<{ id: string }> {
  const patient = await Patient.findById(id).select("_id").lean();
  if (!patient) throw AppError.notFound("Patient not found");
  await Patient.deleteOne({ _id: patient._id });
  return { id: (patient._id as Types.ObjectId).toString() };
}
