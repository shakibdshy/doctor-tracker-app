import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, flattenError } from "zod";

import { fail } from "./envelope";
import { AppError } from "./errors";

/** Final middleware for requests that matched no route. */
export const notFoundHandler: RequestHandler = (req, res) => {
  fail(res, 404, "NOT_FOUND", `Cannot ${req.method} ${req.originalUrl}`);
};

/**
 * Duplicate-key writes surface as the MongoDB driver's error carrying
 * code 11000. Checked structurally: mongoose does not re-export the driver
 * error class, and `instanceof` across driver copies is unreliable.
 */
function isDuplicateKeyError(
  err: unknown,
): err is Error & { code: 11000; keyValue?: Record<string, unknown> } {
  return err instanceof Error && "code" in err && (err as { code?: unknown }).code === 11000;
}

function duplicateKeyMessage(err: { keyValue?: Record<string, unknown> }): string {
  // Shadow fields (nameLower, emailLower…) read better without the suffix.
  const keys = Object.keys(err.keyValue ?? {}).map((key) =>
    key.endsWith("Lower") ? key.slice(0, -"Lower".length) : key,
  );
  if (keys.length > 0) {
    return `A record with the same ${keys.join(" and ")} already exists`;
  }
  return "A record with the same unique value already exists";
}

/**
 * The single central error middleware. Maps the typed AppError, Zod
 * validation failures, and duplicate-key writes to clean envelopes; logs
 * everything else server-side and returns an opaque 500.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof AppError) {
    fail(res, err.status, err.code, err.message, err.details);
    return;
  }
  if (err instanceof ZodError) {
    fail(res, 400, "VALIDATION_ERROR", "The request is invalid", flattenError(err));
    return;
  }
  if (isDuplicateKeyError(err)) {
    fail(res, 409, "CONFLICT", duplicateKeyMessage(err));
    return;
  }
  console.error("[server] unhandled error:", err);
  fail(res, 500, "INTERNAL", "Something went wrong. Please try again.");
}
