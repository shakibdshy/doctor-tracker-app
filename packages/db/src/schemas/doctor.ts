import { z } from "zod";

import { specializationSchema } from "./enums";
import { dateRangeSchema, paginationSchema, phoneSchema } from "./shared";

/** Fields every doctor record carries; the mongoose model mirrors these. */
export const doctorCoreSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  specialization: specializationSchema,
  hospital: z.string().trim().min(1, "Hospital is required").max(120),
  phone: phoneSchema,
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
});

export const doctorCreateSchema = doctorCoreSchema;

export const doctorUpdateSchema = doctorCoreSchema.partial();

/**
 * GET /api/v1/doctors grammar. Coercion is explicit (query strings arrive as
 * strings); the object is strict so operator-injection payloads (`$gt`,
 * `$regex`) fail validation instead of reaching the database.
 */
export const doctorListQuerySchema = paginationSchema
  .extend(dateRangeSchema.shape)
  .extend({
    search: z.string().trim().min(1).max(100).optional(),
    specialization: specializationSchema.optional(),
    hospital: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export type DoctorCreateInput = z.infer<typeof doctorCreateSchema>;
export type DoctorUpdateInput = z.infer<typeof doctorUpdateSchema>;
export type DoctorListQuery = z.infer<typeof doctorListQuerySchema>;
