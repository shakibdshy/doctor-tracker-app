import {
  patientCreateSchema,
  patientListQuerySchema,
  patientUpdateSchema,
} from "@doctor-tracker-app/db/schemas/patient";
import { z } from "zod";
import type { Request, Response } from "express";

import { objectIdSchema } from "@doctor-tracker-app/db/schemas/shared";

import { can } from "@doctor-tracker-app/auth";

import { asyncHandler } from "../../http/async-handler";
import { ok } from "../../http/envelope";
import { AppError } from "../../http/errors";
import * as patientsService from "./service";
import type { AuthedRequest } from "../../middleware/session";

const idParamSchema = z.object({ id: objectIdSchema }).strict();

/** GET /api/v1/patients — query grammar enforced at the boundary. */
export const listPatients = asyncHandler(async (req: Request, res: Response) => {
  const query = patientListQuerySchema.parse(req.query);
  const { data, meta } = await patientsService.listPatients(query);
  ok(res, data, meta);
});

export const getPatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  ok(res, await patientsService.getPatient(id));
});

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const input = patientCreateSchema.parse(req.body);
  ok(res, await patientsService.createPatient(input), undefined, 201);
});

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const input = patientUpdateSchema.parse(req.body);
  // Assignment-only patches (reassign/unassign) are patient:assign operations;
  // full edits are patient:update — both held by Staff today, but the
  // capability matrix stays enforced per operation.
  const assignmentOnly = Object.keys(input).length === 1 && "doctorId" in input;
  if (assignmentOnly && !can((req as AuthedRequest).user?.role, "patient:assign")) {
    throw AppError.forbidden();
  }
  ok(res, await patientsService.updatePatient(id, input));
});

/** DELETE is permanent (GLOSSARY.md) — Admin-only via route capability. */
export const deletePatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  ok(res, await patientsService.deletePatient(id));
});
