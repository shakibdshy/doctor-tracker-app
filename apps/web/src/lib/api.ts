import { authClient } from "@/lib/auth-client";

/**
 * Pagination metadata from the API envelope (ADR-0003 keyset, mirrors the
 * server shape): `nextCursor` feeds the next page request and `hasMore` ends
 * the walk. `total`/`totalPages` ride only the first page of a listing —
 * cursor pages skip the count query, so totals stay last-known while paging.
 */
export type PageMeta = {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
  total?: number;
  totalPages?: number;
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
 * Recovery for a session that lapsed server-side while the tab stayed
 * visible (issue #11): the idle guard only sees input, so a read-only
 * stretch past the 15-minute window ends with the next data action 401ing.
 * Sign out (clears the dead cookie), then land on /login via a full
 * navigation — it also wipes TanStack caches and stale RSC state, which a
 * router-level replace would leave behind. One-shot: concurrent 401s from
 * a burst of queries must not queue duplicate sign-outs/navigations.
 * 403 stays an in-place query error — that's a permission denial, not a
 * dead session.
 */
let sessionRecoveryStarted = false;

async function recoverExpiredSession(): Promise<void> {
  if (sessionRecoveryStarted) return;
  sessionRecoveryStarted = true;
  try {
    await authClient.signOut();
  } catch {
    // The session record may already be gone; the redirect is the goal.
  }
  window.location.assign("/login");
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
    if (response.status === 401) void recoverExpiredSession();
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
