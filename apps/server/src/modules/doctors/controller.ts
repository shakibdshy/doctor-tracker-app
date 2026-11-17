import { objectIdSchema } from "@doctor-tracker-app/db/schemas/shared";
import {
  doctorCreateSchema,
  doctorListQuerySchema,
  doctorUpdateSchema,
} from "@doctor-tracker-app/db/schemas/doctor";
import { z } from "zod";
import type { Request, Response } from "express";

import { ok } from "../../http/envelope";
import { asyncHandler } from "../../http/async-handler";
import * as doctorsService from "./service";

const idParamSchema = z.object({ id: objectIdSchema }).strict();

/** GET /api/v1/doctors — query grammar enforced at the boundary. */
export const listDoctors = asyncHandler(async (req: Request, res: Response) => {
  const query = doctorListQuerySchema.parse(req.query);
  const { data, meta } = await doctorsService.listDoctors(query);
  ok(res, data, meta);
});

export const getDoctor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  ok(res, await doctorsService.getDoctor(id));
});

export const createDoctor = asyncHandler(async (req: Request, res: Response) => {
  const input = doctorCreateSchema.parse(req.body);
  ok(res, await doctorsService.createDoctor(input), undefined, 201);
});

export const updateDoctor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const input = doctorUpdateSchema.parse(req.body);
  ok(res, await doctorsService.updateDoctor(id, input));
});

export const deleteDoctor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  ok(res, await doctorsService.deleteDoctor(id));
});
