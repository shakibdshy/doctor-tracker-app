import { Router } from "express";

import { requireAuth } from "../middleware/session";

const v1Router = Router();

// Session gate: any /api/v1 request without a valid session gets the 401
// error envelope before route matching. Capability checks are applied
// per-route (requireCapability) as feature routers mount here.
v1Router.use(requireAuth);

// Feature routers (doctors, patients, dashboard, team) mount here.

export default v1Router;
