import { z } from "zod";

import { conditionSchema, genderSchema } from "./enums";
import { dateRangeSchema, objectIdSchema, paginationSchema, phoneSchema } from "./shared";

export const patientCoreSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: phoneSchema,
  gender: genderSchema,
  dateOfBirth: z.coerce
    .date()
    .refine((date) => date < new Date(), "Date of birth must be in the past"),
  condition: conditionSchema,
  /** Optional Assignment: at most one doctor per patient (GLOSSARY.md). */
  doctorId: objectIdSchema.nullish(),
  notes: z.string().trim().max(2000).optional(),
});

export const patientCreateSchema = patientCoreSchema;

export const patientUpdateSchema = patientCoreSchema.partial();

/**
 * GET /api/v1/patients grammar. `doctor: "unassigned"` selects the unassigned
 * pool; an ObjectId selects one doctor's list.
 */
export const patientListQuerySchema = paginationSchema
  .extend(dateRangeSchema.shape)
  .extend({
    search: z.string().trim().min(1).max(100).optional(),
    condition: conditionSchema.optional(),
    doctor: z.union([objectIdSchema, z.literal("unassigned")]).optional(),
  })
  .strict();

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;
export type PatientListQuery = z.infer<typeof patientListQuerySchema>;
