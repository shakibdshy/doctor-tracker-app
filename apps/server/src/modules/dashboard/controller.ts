import type { Request, Response } from "express";

import { asyncHandler } from "../../http/async-handler";
import { ok } from "../../http/envelope";
// The cached getter (TTL + generation counter) — not the raw compute.
import { getDashboardSummary as getCachedDashboardSummary } from "./cache";

/** GET /api/v1/dashboard — one request, everything computed in parallel. */
export const getDashboardSummary = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await getCachedDashboardSummary());
});
