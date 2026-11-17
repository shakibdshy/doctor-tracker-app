import { Router } from "express";

import { requireCapability } from "../../middleware/session";
import * as controller from "./controller";

export const patientsRouter = Router();

// Reads are authenticated at the /api/v1 gate. Patients are Staff-writable:
// create/edit (incl. reassign and unassign via PATCH doctorId) need only a
// session; Delete is the Admin-only operation.
patientsRouter.get("/", controller.listPatients);
patientsRouter.get("/:id", controller.getPatient);
patientsRouter.post("/", requireCapability("patient:create"), controller.createPatient);
patientsRouter.patch("/:id", requireCapability("patient:update"), controller.updatePatient);
patientsRouter.delete("/:id", requireCapability("patient:delete"), controller.deletePatient);
