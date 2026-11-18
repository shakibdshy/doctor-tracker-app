import type { Response } from "express";

/**
 * Pagination metadata attached to successful list responses (ADR-0003,
 * keyset): `nextCursor` feeds the next page request and `hasMore` ends the
 * walk — no offset cost at depth. `total`/`totalPages` ride only the first
 * page of a listing (the one place the pager shows record totals); cursor
 * pages skip the count query and clients keep the last known totals.
 */
export type PageMeta = {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
  total?: number;
  totalPages?: number;
};

export type SuccessBody<T> = { success: true; data: T; meta?: PageMeta };

export type ErrorBody = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

/** Send the uniform success envelope: `{ success: true, data, meta? }`. */
export function ok<T>(res: Response, data: T, meta?: PageMeta, status = 200): void {
  const body: SuccessBody<T> = meta ? { success: true, data, meta } : { success: true, data };
  res.status(status).json(body);
}

/** Send the uniform error envelope: `{ success: false, error: { code, message } }`. */
export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const error: ErrorBody["error"] =
    details === undefined
      ? { code, message }
      : { code, message, details };
  res.status(status).json({ success: false, error } satisfies ErrorBody);
}
