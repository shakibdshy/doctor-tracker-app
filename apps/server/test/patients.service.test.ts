import { Patient } from "@doctor-tracker-app/db/models/patient.model";
import { CONDITIONS } from "@doctor-tracker-app/db/schemas/enums";import { Doctor } from "@doctor-tracker-app/db/models/doctor.model";
import mongoose from "mongoose";
import { beforeEach, afterEach, describe, expect, test } from "bun:test";

import type { PatientCreateInput } from "@doctor-tracker-app/db/schemas/patient";
import {
  createPatient,
  deletePatient,
  getPatient,
  listPatients,
  updatePatient,
} from "../src/modules/patients/service";
import { createTestDb, type TestDb } from "./helpers/db";

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await db.teardown();
});

let doctorCounter = 0;

async function insertDoctor(name = "Amara Osei") {
  doctorCounter += 1;
  const email = `doctor${doctorCounter}@hospital.test`;
  const doctor = await Doctor.create({
    name,
    nameLower: name.toLowerCase(),
    specialization: "Cardiology",
    hospital: "St. Mary General",
    hospitalLower: "st. mary general",
    phone: "+1 555-0100",
    email,
    emailLower: email,
  });
  return doctor;
}

let patientCounter = 0;

function patientInput(
  overrides: Partial<PatientCreateInput> = {},
): PatientCreateInput {
  patientCounter += 1;
  return {
    name: `Patient ${patientCounter}`,
    phone: `+1 555-02${String(patientCounter).padStart(2, "0")}`,
    gender: "female" as const,
    dateOfBirth: new Date("1990-06-15"),
    condition: "Asthma",
    doctorId: null,
    notes: undefined,
    ...overrides,
  };
}

async function insertPatient(
  doctorId: string | null,
  overrides: Partial<{
    name: string;
    phone: string;
    condition: PatientCreateInput["condition"];
    createdAt: Date;
  }> = {},
) {
  const { createdAt, ...input } = overrides;
  const created = await createPatient(patientInput({ doctorId, ...input }));
  if (createdAt) {
    await Patient.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(created.id) },
      { $set: { createdAt } },
    );
  }
  return created;
}

describe("patients service — listPatients", () => {
  test("returns newest-first with envelope meta and doctor names", async () => {
    const doctor = await insertDoctor();
    const old = await insertPatient(doctor.id, { name: "Old Patient", createdAt: new Date("2026-01-10") });
    const newest = await insertPatient(doctor.id, { name: "New Patient", createdAt: new Date("2026-06-10") });

    const { data, meta } = await listPatients({ page: 1, limit: 1 });

    expect(meta.total).toBe(2);
    expect(meta.totalPages).toBe(2);
    expect(data.map((patient) => patient.id)).toEqual([newest.id]);
    expect(data[0]?.doctor).toEqual({ id: doctor.id, name: doctor.name });
    expect(data[0]).not.toHaveProperty("nameLower");
    void old;
  });

  test("search matches name and phone prefixes, anchored", async () => {
    await insertPatient(null, { name: "Alice Marsh", phone: "+1 555-0777" });
    await insertPatient(null, { name: "Bob Marshal" });
    await insertPatient(null, { name: "Cara Lin", phone: "+1 555-0778" });

    // Field-start anchoring (ADR-0001): "marsh" only matches names that
    // START with it — surnames mid-field don't match.
    const byName = await listPatients({ page: 1, limit: 20, search: "alice" });
    expect(byName.meta.total).toBe(1);
    const byBob = await listPatients({ page: 1, limit: 20, search: "bob" });
    expect(byBob.meta.total).toBe(1);

    const midWord = await listPatients({ page: 1, limit: 20, search: "arshal" });
    expect(midWord.meta.total).toBe(0);

    const byPhone = await listPatients({ page: 1, limit: 20, search: "+1 555-077" });
    expect(byPhone.meta.total).toBe(2);
  });

  test("condition and doctor filters narrow the list; 'unassigned' selects the pool", async () => {
    const doctorA = await insertDoctor();
    const doctorB = await insertDoctor("Bilal Rahman");
    await insertPatient(doctorA.id, { name: "A-Asthma", condition: "Asthma" });
    await insertPatient(doctorA.id, { name: "A-Migraine", condition: "Migraine" });
    await insertPatient(doctorB.id, { name: "B-Asthma", condition: "Asthma" });
    await insertPatient(null, { name: "Pool Asthma", condition: "Asthma" });

    const byCondition = await listPatients({ page: 1, limit: 20, condition: "Asthma" });
    expect(byCondition.meta.total).toBe(3);

    const byDoctor = await listPatients({ page: 1, limit: 20, doctor: doctorA.id });
    expect(byDoctor.meta.total).toBe(2);
    expect(byDoctor.data.every((patient) => patient.doctor?.id === doctorA.id)).toBe(true);

    const unassigned = await listPatients({ page: 1, limit: 20, doctor: "unassigned" });
    expect(unassigned.meta.total).toBe(1);
    expect(unassigned.data[0]?.name).toBe("Pool Asthma");
    expect(unassigned.data[0]?.doctor).toBeNull();
  });

  test("createdAt range filters on the day-inclusive upper bound", async () => {
    await insertPatient(null, { name: "June Patient", createdAt: new Date("2026-06-20T15:00:00Z") });
    await insertPatient(null, { name: "May Patient", createdAt: new Date("2026-05-02T10:00:00Z") });

    const { meta } = await listPatients({
      page: 1,
      limit: 20,
      from: "2026-06-01",
      to: "2026-06-30",
    } as never);
    expect(meta.total).toBe(1);
  });
});

describe("patients service — create/update/unassign/delete", () => {
  test("create syncs shadow fields and stores the doctor reference", async () => {
    const doctor = await insertDoctor();
    const created = await createPatient(
      patientInput({ name: "Mixed Case", doctorId: doctor.id, phone: "+1 555-0999" }),
    );
    const raw = await Patient.findById(created.id).lean();
    expect(raw?.nameLower).toBe("mixed case");
    expect(raw?.phoneLower).toBe("+1 555-0999");
    expect(String(raw?.doctor)).toBe(doctor.id);
  });

  test("create rejects an unknown doctor reference", async () => {
    const missingId = "5f8d0d55b54764421b7156c9";
    try {
      await createPatient(patientInput({ doctorId: missingId }));
      throw new Error("expected not-found");
    } catch (error) {
      expect((error as { status?: number }).status).toBe(404);
    }
  });

  test("update reassigns to another doctor and resyncs shadows", async () => {
    const doctorA = await insertDoctor();
    const doctorB = await insertDoctor("Bilal Rahman");
    const created = await insertPatient(doctorA.id, { name: "Before Rename" });

    const updated = await updatePatient(created.id, {
      name: "After Rename",
      doctorId: doctorB.id,
    });
    expect(updated.name).toBe("After Rename");
    expect(updated.doctor?.id).toBe(doctorB.id);

    const raw = await Patient.findById(created.id).lean();
    expect(raw?.nameLower).toBe("after rename");
  });

  test("unassign preserves the record and empties its doctor", async () => {
    const doctor = await insertDoctor();
    const created = await insertPatient(doctor.id, { name: "To Unassign" });

    // Unassign rides the PATCH path (doctorId presence), per the API contract.
    const unassigned = await updatePatient(created.id, { doctorId: null });
    expect(unassigned.doctor).toBeNull();

    const raw = await Patient.findById(created.id).lean();
    expect(raw).not.toBeNull();
    expect(raw?.doctor).toBeNull();
    expect(raw?.name).toBe("To Unassign");
  });

  test("delete permanently deletes the record, unlike unassign", async () => {
    const doctor = await insertDoctor();
    const kept = await insertPatient(doctor.id, { name: "Kept" });
    const removed = await insertPatient(doctor.id, { name: "Removed" });

    await updatePatient(kept.id, { doctorId: null });
    await deletePatient(removed.id);

    expect(await Patient.countDocuments({})).toBe(1);
    const survivor = await Patient.findById(kept.id).lean();
    expect(survivor?.name).toBe("Kept");
    expect(survivor?.doctor).toBeNull();
    expect(await Patient.findById(removed.id).lean()).toBeNull();
  });

  test("404s for unknown ids", async () => {
    const missingId = "5f8d0d55b54764421b7156c9";
    for (const call of [getPatient, updatePatient, deletePatient]) {
      try {
        await call(missingId, { name: "X" } as never);
        throw new Error(`expected 404 from ${call.name}`);
      } catch (error) {
        expect((error as { status?: number }).status).toBe(404);
      }
    }
  });
});

describe("patients service — explain paths (compound indexes)", () => {
  test("doctor and condition filters use their compound indexes", async () => {
    const doctors = [];
    for (let i = 0; i < 4; i++) {
      doctors.push(await insertDoctor(`Doctor ${i}`));
    }
    const rows = [];
    for (let i = 0; i < 300; i++) {
      const doctor = doctors[i % doctors.length] as (typeof doctors)[number];
      rows.push({
        name: `Patient ${i}`,
        nameLower: `patient ${i}`,
        phone: `+1 555-0${i}`,
        phoneLower: `+1 555-0${i}`,
        gender: "female",
        dateOfBirth: new Date("1990-01-01"),
        condition: CONDITIONS[i % CONDITIONS.length],
        doctor: i % 10 === 0 ? null : doctor._id,
      });
    }
    await Patient.insertMany(rows);

    async function assertIndexScan(filter: Record<string, unknown>) {
      const explain = await Patient.find(filter)
        .sort({ createdAt: -1 })
        .limit(20)
        .explain("executionStats");
      const plan = (explain as { queryPlanner?: { winningPlan?: Record<string, unknown> } })
        .queryPlanner?.winningPlan;
      expect(plan).toBeDefined();
      const stages: string[] = [];
      const visit = (node: Record<string, unknown> | undefined) => {
        if (!node) return;
        if (typeof node.stage === "string") stages.push(node.stage);
        const input = node.inputStage as Record<string, unknown> | undefined;
        if (input) visit(input);
        const branches = node.inputStages as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(branches)) branches.forEach(visit);
        const shards = node.shards as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(shards)) shards.forEach(visit);
      };
      visit(plan);
      expect(stages).toContain("IXSCAN");
      expect(stages).not.toContain("COLLSCAN");
    }

    const someDoctor = doctors[0] as (typeof doctors)[number];
    await assertIndexScan({ doctor: someDoctor._id, createdAt: { $gte: new Date("2026-01-01") } });
    await assertIndexScan({ condition: CONDITIONS[0], createdAt: { $gte: new Date("2026-01-01") } });
    await assertIndexScan({ doctor: null });
  });
});
