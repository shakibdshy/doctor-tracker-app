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

/** Pagination metadata from the API envelope (mirrors the server shape). */
export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** Error raised by any non-success API envelope. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type EnvelopeBody<T> =
  | { success: true; data: T; meta?: PageMeta }
  | { success: false; error: { code: string; message: string; details?: unknown } };

/** Human-facing message for any thrown API failure. */
export function apiErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

/**
 * Same-origin fetch that unwraps the uniform response envelope (ADR-0002:
 * requests hit the Next.js rewrite, never the server origin directly).
 * Non-success envelopes raise ApiError with the server's code and message.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; meta?: PageMeta }> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  let body: EnvelopeBody<T> | null = null;
  try {
    body = (await response.json()) as EnvelopeBody<T>;
  } catch {
    // Non-JSON failure (proxy error page, network body) — fall through.
  }
  if (!response.ok || !body || body.success === false) {
    const error =
      body && body.success === false ? body.error : undefined;
    throw new ApiError(
      error?.message ?? "Something went wrong. Please try again.",
      response.status,
      error?.code ?? "INTERNAL",
    );
  }
  return { data: body.data, meta: body.meta };
}
