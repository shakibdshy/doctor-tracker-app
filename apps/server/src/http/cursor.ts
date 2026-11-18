import { AppError } from "./errors";

/**
 * Opaque keyset cursor (ADR-0003): base64url of the last page's sort position
 * in the (createdAt: -1, _id: -1) order. Clients treat it as a token; the
 * server decodes and validates every field, so a stale or hand-crafted cursor
 * fails as a 400 — never a silently wrong page.
 */
type CursorPayload = { c: string; i: string };

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export function encodeCursor(createdAt: Date, id: string): string {
  const payload: CursorPayload = { c: createdAt.toISOString(), i: id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  let payload: Partial<CursorPayload>;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    payload = JSON.parse(json) as Partial<CursorPayload>;
  } catch {
    throw AppError.badRequest("Invalid pagination cursor");
  }
  const createdAt = typeof payload.c === "string" ? new Date(payload.c) : new Date(NaN);
  if (
    Number.isNaN(createdAt.getTime()) ||
    typeof payload.i !== "string" ||
    !OBJECT_ID_PATTERN.test(payload.i)
  ) {
    throw AppError.badRequest("Invalid pagination cursor");
  }
  return { createdAt, id: payload.i };
}
