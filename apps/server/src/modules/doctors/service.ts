import { Doctor } from "@doctor-tracker-app/db/models/doctor.model";
import { Patient } from "@doctor-tracker-app/db/models/patient.model";
import type {
  DoctorCreateInput,
  DoctorListQuery,
  DoctorUpdateInput,
} from "@doctor-tracker-app/db/schemas/doctor";
import { exclusiveTo } from "@doctor-tracker-app/db/schemas/shared";
import { Types } from "mongoose";

import { decodeCursor, encodeCursor } from "../../http/cursor";
import { AppError } from "../../http/errors";
import type { PageMeta } from "../../http/envelope";
import { invalidateDashboardCache } from "../dashboard/cache";

/** The fields the list tables render; ids become strings for the envelope. */
const LIST_PROJECTION = "name specialization hospital phone email createdAt";

/** The raw record shape toItem consumes (hydrated or lean). */
type DoctorRecord = {
  _id: { toString(): string };
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt: Date;
};

export type DoctorListItem = {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt: Date;
};

export type DoctorDetail = DoctorListItem;

/**
 * ADR-0001: anchored, case-sensitive prefix regex over the lowercase shadow
 * fields. Anchoring is what keeps the queries index-backed; escaping keeps
 * user input from becoming a wildcard pattern.
 */
function prefixPattern(input: string): RegExp {
  const escaped = input.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}`);
}

/** Keep the lowercase shadow fields in sync (service-layer duty, ADR-0001). */
function shadowFields(input: { name: string; hospital: string; email: string }) {
  return {
    nameLower: input.name.toLowerCase(),
    hospitalLower: input.hospital.toLowerCase(),
    emailLower: input.email.toLowerCase(),
  };
}

/** Shape the envelope returns: string ids, list-projection fields only. */
function toItem(raw: DoctorRecord): DoctorListItem {
  return {
    id: raw._id.toString(),
    name: raw.name,
    specialization: raw.specialization,
    hospital: raw.hospital,
    phone: raw.phone,
    email: raw.email,
    createdAt: raw.createdAt,
  };
}

/**
 * Map the driver's duplicate-key write to the domain conflict (409);
 * anything else rethrows untouched.
 */
function toConflictIfDuplicate(error: unknown): never {
  const isDuplicate =
    error instanceof Error && "code" in error && (error as { code?: unknown }).code === 11000;
  if (isDuplicate) {
    throw AppError.conflict("A doctor with this email already exists");
  }
  throw error;
}

/** The filter grammar listDoctors builds; plain shapes, no driver generics. */
type DoctorFilter = {
  $and?: DoctorFilter[];
  /** Search prefixes, or the keyset continuation branches (ADR-0003). */
  $or?:
    | { nameLower?: RegExp; emailLower?: RegExp; hospitalLower?: RegExp }[]
    | { createdAt?: Date | { $lt: Date }; _id?: Types.ObjectId }[];
  specialization?: string;
  hospitalLower?: RegExp;
  createdAt?: Date | { $gte?: Date; $lt?: Date };
};

export async function listDoctors(
  query: DoctorListQuery,
): Promise<{ data: DoctorListItem[]; meta: PageMeta }> {
  const conditions: DoctorFilter[] = [];
  if (query.search) {
    const pattern = prefixPattern(query.search);
    conditions.push({
      $or: [{ nameLower: pattern }, { emailLower: pattern }, { hospitalLower: pattern }],
    });
  }
  if (query.specialization) conditions.push({ specialization: query.specialization });
  if (query.hospital) {
    conditions.push({ hospitalLower: prefixPattern(query.hospital) });
  }

  const createdAtRange = exclusiveTo(query);
  if (Object.keys(createdAtRange).length > 0) conditions.push({ createdAt: createdAtRange });

  // Keyset predicate (ADR-0003): strictly-after the cursor position in the
  // (createdAt: -1, _id: -1) order — index-backed, no skip cost at depth.
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  if (cursor) {
    const cursorId = new Types.ObjectId(cursor.id);
    conditions.push({
      $or: [
        { createdAt: { $lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $lt: cursorId } },
      ] as DoctorFilter["$or"],
    });
  }

  const filter: DoctorFilter =
    conditions.length > 1 ? { $and: conditions } : (conditions[0] ?? {});

  // limit+1 peek detects hasMore without a second query; the count runs only
  // on the first page — the one place the pager shows record totals.
  // The filter grammar is built above; the single cast adapts it to the
  // driver's mapped filter generics.
  const [docs, total] = await Promise.all([
    Doctor.find(filter as never)
      .sort({ createdAt: -1, _id: -1 })
      .limit(query.limit + 1)
      .select(LIST_PROJECTION)
      .lean(),
    cursor ? Promise.resolve(null) : Doctor.countDocuments(filter as never),
  ]);

  const hasMore = docs.length > query.limit;
  const page = docs.slice(0, query.limit);
  const last = page.at(-1);

  return {
    data: page.map((doc) => toItem(doc as DoctorRecord)),
    meta: {
      limit: query.limit,
      hasMore,
      // A cursor only exists if there is a next page to feed it to.
      nextCursor: hasMore && last ? encodeCursor(last.createdAt, last._id.toString()) : null,
      ...(total !== null && {
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      }),
    },
  };
}

export async function getDoctor(id: string): Promise<DoctorDetail> {
  const doctor = await Doctor.findById(id).select(LIST_PROJECTION).lean();
  if (!doctor) throw AppError.notFound("Doctor not found");
  return toItem(doctor as unknown as DoctorRecord);
}

export async function createDoctor(input: DoctorCreateInput): Promise<DoctorDetail> {
  try {
    const doctor = await Doctor.create({ ...input, ...shadowFields(input) });
    invalidateDashboardCache();
    return toItem(doctor.toObject() as DoctorRecord);
  } catch (error) {
    toConflictIfDuplicate(error);
  }
}

export async function updateDoctor(
  id: string,
  input: DoctorUpdateInput,
): Promise<DoctorDetail> {
  const doctor = await Doctor.findById(id);
  if (!doctor) throw AppError.notFound("Doctor not found");

  if (input.name !== undefined) doctor.name = input.name;
  if (input.specialization !== undefined) doctor.specialization = input.specialization;
  if (input.hospital !== undefined) doctor.hospital = input.hospital;
  if (input.phone !== undefined) doctor.phone = input.phone;
  if (input.email !== undefined) doctor.email = input.email;
  Object.assign(doctor, shadowFields({ name: doctor.name, hospital: doctor.hospital, email: doctor.email }));

  try {
    await doctor.save();
  } catch (error) {
    toConflictIfDuplicate(error);
  }
  invalidateDashboardCache();
  return toItem(doctor.toObject() as DoctorRecord);
}

/**
 * Deleting a doctor unassigns their patients in the same service operation
 * (GLOSSARY.md: Unassign preserves records; Delete removes the doctor).
 * Unassign runs first: on a free-tier MongoDB without multi-document
 * transactions, a failure between the two writes leaves patients unassigned
 * with the doctor still present — a state a retry resolves cleanly, and the
 * reverse ordering would leave dangling references instead.
 */
export async function deleteDoctor(id: string): Promise<{ id: string }> {
  const doctor = await Doctor.findById(id).select("_id").lean();
  if (!doctor) throw AppError.notFound("Doctor not found");

  await Patient.updateMany({ doctor: doctor._id }, { $set: { doctor: null } });
  await Doctor.deleteOne({ _id: doctor._id });
  invalidateDashboardCache();
  return { id: doctor._id.toString() };
}
