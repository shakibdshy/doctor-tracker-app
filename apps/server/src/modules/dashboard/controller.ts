import type { Request, Response } from "express";

import { asyncHandler } from "../../http/async-handler";
import { ok } from "../../http/envelope";
import * as dashboardService from "./service";

/** GET /api/v1/dashboard — one request, everything computed in parallel. */
export const getDashboardSummary = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await dashboardService.getDashboardSummary());
});
