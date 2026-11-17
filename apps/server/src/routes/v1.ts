import { Router } from "express";

import { requireAuth } from "../middleware/session";
import { dashboardRouter } from "../modules/dashboard/routes";
import { doctorsRouter } from "../modules/doctors/routes";
import { patientsRouter } from "../modules/patients/routes";

const v1Router = Router();

// Session gate: any /api/v1 request without a valid session gets the 401
// error envelope before route matching. Capability checks are applied
// per-route (requireCapability) as feature routers mount here.
v1Router.use(requireAuth);

// Feature routers
v1Router.use("/dashboard", dashboardRouter);
v1Router.use("/doctors", doctorsRouter);
v1Router.use("/patients", patientsRouter);

export default v1Router;
