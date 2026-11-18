import { z } from "zod";

/** Mongo ObjectId string, lowercased hex. */
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

/**
 * Shared list-query grammar: server-capped page size + opaque keyset cursor.
 * An absent `cursor` selects the first page (the only page that pays for a
 * count — ADR-0003); any other page resumes from the previous response's
 * `nextCursor`. The string is opaque to clients: the server decodes and
 * validates it, so garbage fails as a 400, never a wrong page.
 */
export const paginationSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .positive()
    .default(20)
    // The server caps page size at 100 regardless of client input.
    .transform((limit) => Math.min(limit, 100)),
  cursor: z.string().max(512).optional(),
});

/** Inclusive day-level created-at range: `to` becomes an exclusive upper bound. */
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type DateRange = z.infer<typeof dateRangeSchema>;

/**
 * Turn the inclusive `to` date into MongoDB's exclusive `$lt` upper bound.
 * Coerced dates parse as UTC midnight; all arithmetic stays in UTC so the
 * chosen day is fully covered regardless of the server's local timezone.
 */
export function exclusiveTo(range: { from?: Date; to?: Date }): {
  $gte?: Date;
  $lt?: Date;
} {
  const rangeQuery: { $gte?: Date; $lt?: Date } = {};
  if (range.from) rangeQuery.$gte = range.from;
  if (range.to) {
    const upper = new Date(range.to);
    upper.setUTCDate(upper.getUTCDate() + 1);
    upper.setUTCHours(0, 0, 0, 0);
    rangeQuery.$lt = upper;
  }
  return rangeQuery;
}

/** Shared phone grammar for doctors and patients. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+()\-.\s\d]{7,20}$/, "Enter a valid phone number");
