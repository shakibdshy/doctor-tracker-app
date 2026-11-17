/** Machine-readable error codes carried in the error envelope. */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

/**
 * The one typed application error. Services and middleware throw this; the
 * central error middleware renders it into the error envelope. Anything else
 * thrown becomes a logged 500 — raw errors never reach the client.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    options?: { details?: unknown; cause?: unknown },
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = options?.details;
    if (options?.cause !== undefined) this.cause = options.cause;
  }

  static badRequest(message = "The request is invalid", details?: unknown) {
    return new AppError(400, "VALIDATION_ERROR", message, { details });
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(401, "UNAUTHENTICATED", message);
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new AppError(403, "FORBIDDEN", message);
  }

  static notFound(message = "The requested resource was not found") {
    return new AppError(404, "NOT_FOUND", message);
  }

  static conflict(message = "The resource already exists") {
    return new AppError(409, "CONFLICT", message);
  }
}
