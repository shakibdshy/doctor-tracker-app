import { Router } from "express";

import { requireCapability } from "../../middleware/session";
import * as controller from "./controller";

export const doctorsRouter = Router();

// Reads are authenticated at the /api/v1 gate; writes carry their capability.
doctorsRouter.get("/", controller.listDoctors);
doctorsRouter.get("/:id", controller.getDoctor);
doctorsRouter.post("/", requireCapability("doctor:create"), controller.createDoctor);
doctorsRouter.patch("/:id", requireCapability("doctor:update"), controller.updateDoctor);
doctorsRouter.delete("/:id", requireCapability("doctor:delete"), controller.deleteDoctor);
