import { Router } from "express";

import { requireCapability } from "../../middleware/session";
import * as controller from "./controller";

export const dashboardRouter = Router();

// Both roles hold dashboard:read; the /api/v1 gate owns authentication.
dashboardRouter.get("/", requireCapability("dashboard:read"), controller.getDashboardSummary);
