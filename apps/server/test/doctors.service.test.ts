import { Patient } from "@doctor-tracker-app/db/models/patient.model";
import { Doctor } from "@doctor-tracker-app/db/models/doctor.model";
import { SPECIALIZATIONS } from "@doctor-tracker-app/db/schemas/enums";
import { beforeEach, afterEach, describe, expect, test } from "bun:test";
import mongoose from "mongoose";

import {
  createDoctor,
  deleteDoctor,
  getDoctor,
  listDoctors,
  updateDoctor,
} from "../src/modules/doctors/service";
import { createTestDb, type TestDb } from "./helpers/db";

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await db.teardown();
});

function doctorInput(overrides: Partial<{ name: string; email: string; hospital: string; specialization: string; phone: string }> = {}) {
  return {
    name: "Amara Osei",
    specialization: "Cardiology",
    hospital: "St. Mary General",
    phone: "+1 555-0100",
    email: "amara.osei@hospital.test",
    ...overrides,
  };
}

let doctorCounter = 0;

async function insertDoctor(
  overrides: Partial<{
    name: string;
    email: string;
    hospital: string;
    specialization: string;
    createdAt: Date;
  }> = {},
) {
  const { createdAt, ...input } = overrides;
  // Unique default email: the duplicate guard is real behavior under test.
  doctorCounter += 1;
  const full = doctorInput({
    email: `doctor${doctorCounter}@hospital.test`,
    ...input,
  } as never);
  const created = await createDoctor(full as never);
  if (createdAt) {
    // Seed-style backdating through the raw collection: mongoose's query
    // layer won't touch a timestamped createdAt.
    await Doctor.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(created.id) },
      { $set: { createdAt } },
    );
  }
  return created;
}

async function insertPatient(doctorId: string | null, name = "Patient") {
  const patient = await Patient.create({
    name,
    nameLower: name.toLowerCase(),
    phone: "+1 555-0200",
    phoneLower: "+1 555-0200",
    gender: "female",
    dateOfBirth: new Date("1990-01-01"),
    condition: "Asthma",
    doctor: doctorId,
  });
  return patient;
}

describe("doctors service — listDoctors", () => {
  test("returns newest-first with envelope meta", async () => {
    await insertDoctor({ name: "Old Doctor", createdAt: new Date("2026-01-15") });
    const mid = await insertDoctor({ name: "Mid Doctor", createdAt: new Date("2026-03-15") });
    const newest = await insertDoctor({ name: "New Doctor", createdAt: new Date("2026-06-15") });

    const { data, meta } = await listDoctors({
      limit: 2,
    } as never);

    expect(meta.total).toBe(3);
    expect(meta.totalPages).toBe(2);
    expect(meta.hasMore).toBe(true);
    expect(data.map((doctor) => doctor.id)).toEqual([newest.id, mid.id].map(String));
    expect(data[0]).not.toHaveProperty("nameLower");
    expect(data[0]).toHaveProperty("name");
  });

  test("search is anchored to field starts, case-insensitive, across name/email/hospital", async () => {
    await insertDoctor({ name: "Johnathan Cole", email: "johnathan@hospital.test" });
    await insertDoctor({ name: "Mary Johnson", email: "mary@hospital.test" });
    await insertDoctor({ email: "ajoHnson@hospital.test", name: "A Person" });
    await insertDoctor({ name: "Joanna Reed" });
    await insertDoctor({ hospital: "St. John's Clinic", name: "Hospital Match" });

    const { data, meta } = await listDoctors({ limit: 20, search: "joh" } as never);

    // Field-start anchoring only (ADR-0001): matches "Johnathan" (name);
    // "Mary Johnson" starts with "mary", "ajohnson@…" starts with "a",
    // "St. John's" starts with "st." — none qualify.
    const names = data.map((doctor) => doctor.name).sort();
    expect(meta.total).toBe(1);
    expect(names).toEqual(["Johnathan Cole"]);
  });

  test("search matches hospital and email prefixes too", async () => {
    await insertDoctor({ hospital: "Johns Memorial", name: "Doctor A" });
    await insertDoctor({ email: "john.doe@hospital.test", name: "Doctor B" });

    const byHospital = await listDoctors({ limit: 20, search: "johns" } as never);
    expect(byHospital.meta.total).toBe(1);
    expect(byHospital.data[0]?.name).toBe("Doctor A");

    const byEmail = await listDoctors({ limit: 20, search: "john.doe" } as never);
    expect(byEmail.meta.total).toBe(1);
    expect(byEmail.data[0]?.name).toBe("Doctor B");
  });

  test("search escapes regex metacharacters", async () => {
    await insertDoctor({ name: "(Weird) Name", email: "weird@hospital.test" });
    await insertDoctor({ name: "A.Weird.ordinary", email: "adot@hospital.test" });
    await insertDoctor({ name: "abweird filler", email: "ab@hospital.test" });

    // "(" is literal: matches the name that starts with it, nothing else.
    const paren = await listDoctors({ limit: 20, search: "(we" } as never);
    expect(paren.meta.total).toBe(1);
    expect(paren.data[0]?.name).toBe("(Weird) Name");

    // "." is literal: "a.we" must not wildcard-match "abweird".
    const dot = await listDoctors({ limit: 20, search: "a.we" } as never);
    expect(dot.meta.total).toBe(1);
    expect(dot.data[0]?.name).toBe("A.Weird.ordinary");
  });

  test("specialization, hospital, and date-range filters narrow the list", async () => {
    await insertDoctor({ name: "Cardio One", specialization: "Cardiology" });
    await insertDoctor({ name: "Cardio Two", specialization: "Cardiology" });
    await insertDoctor({ name: "Derm One", specialization: "Dermatology" });
    await insertDoctor({ name: "Other Hospital", hospital: "Northside", specialization: "Cardiology" });
    await insertDoctor({ name: "Old Cardio", createdAt: new Date("2025-12-01") });

    const bySpecialization = await listDoctors({
      limit: 20,
      specialization: "Cardiology",
    } as never);
    // Cardio One, Cardio Two, Other Hospital, and Old Cardio are Cardiology.
    expect(bySpecialization.meta.total).toBe(4);

    const byHospital = await listDoctors({
      limit: 20,
      hospital: "st.",
    } as never);
    // Hospital filter is prefix-based like search: Cardio One, Cardio Two,
    // Derm One, and Old Cardio share the default "St. Mary General".
    expect(byHospital.meta.total).toBe(4);

    const byRange = await listDoctors({
      limit: 20,
      from: "2026-01-01",
      to: "2026-12-31",
    } as never);
    expect(byRange.meta.total).toBe(4);

    const combined = await listDoctors({
      limit: 20,
      specialization: "Cardiology",
      hospital: "northside",
    } as never);
    expect(combined.meta.total).toBe(1);
    expect(combined.data[0]?.name).toBe("Other Hospital");
  });
});

describe("doctors service — keyset pagination (ADR-0003)", () => {
  test("walks pages by cursor; cursor pages carry no count", async () => {
    const oldest = await insertDoctor({ name: "Old Doctor", createdAt: new Date("2026-01-15") });
    const mid = await insertDoctor({ name: "Mid Doctor", createdAt: new Date("2026-03-15") });
    const newest = await insertDoctor({ name: "New Doctor", createdAt: new Date("2026-06-15") });

    const page1 = await listDoctors({ limit: 2 } as never);
    expect(page1.meta.total).toBe(3);
    expect(page1.meta.hasMore).toBe(true);
    expect(page1.meta.nextCursor).toBeTypeOf("string");
    expect(page1.data.map((doctor) => doctor.id)).toEqual([newest.id, mid.id].map(String));

    const page2 = await listDoctors({
      limit: 2,
      cursor: page1.meta.nextCursor!,
    } as never);
    expect(page2.meta.total).toBeUndefined();
    expect(page2.meta.totalPages).toBeUndefined();
    expect(page2.meta.hasMore).toBe(false);
    expect(page2.meta.nextCursor).toBeNull();
    expect(page2.data.map((doctor) => doctor.id)).toEqual([oldest.id].map(String));
  });

  test("keyset composes with search filters", async () => {
    for (let i = 0; i < 5; i++) {
      await insertDoctor({ name: `John Doctor ${i}`, createdAt: new Date(Date.UTC(2026, i, 1)) });
    }
    await insertDoctor({ name: "Unrelated", createdAt: new Date("2026-02-02") });

    const page1 = await listDoctors({ limit: 2, search: "john" } as never);
    expect(page1.meta.total).toBe(5);
    expect(page1.data).toHaveLength(2);
    const page2 = await listDoctors({
      limit: 2,
      search: "john",
      cursor: page1.meta.nextCursor!,
    } as never);
    expect(page2.data).toHaveLength(2);
    expect(page2.meta.hasMore).toBe(true);
    // The cursor page must not leak the non-matching doctor.
    expect(page2.data.every((doctor) => doctor.name.startsWith("John"))).toBe(true);
  });
});

describe("doctors service — create/update", () => {
  test("create syncs lowercase shadow fields", async () => {
    const created = await createDoctor(doctorInput({ name: "MixedCase Name", hospital: "MixedCase Hospital" }) as never);
    const raw = await Doctor.findById(created.id).lean();
    expect(raw?.nameLower).toBe("mixedcase name");
    expect(raw?.hospitalLower).toBe("mixedcase hospital");
    expect(raw?.emailLower).toBe("amara.osei@hospital.test");
  });

  test("update replaces values and resyncs shadow fields", async () => {
    const created = await insertDoctor();
    const updated = await updateDoctor(created.id, {
      name: "Renamed Doctor",
      hospital: "Renamed Clinic",
      email: "renamed@hospital.test",
    });
    expect(updated.name).toBe("Renamed Doctor");

    const byNewName = await listDoctors({ limit: 20, search: "rename" } as never);
    expect(byNewName.meta.total).toBe(1);
    const byOldName = await listDoctors({ limit: 20, search: "amara" } as never);
    expect(byOldName.meta.total).toBe(0);
  });

  test("duplicate email raises a clean 409 conflict", async () => {
    await insertDoctor({ email: "dup@hospital.test" });
    try {
      await createDoctor(doctorInput({ email: "DUP@hospital.test" }) as never);
      throw new Error("expected conflict");
    } catch (error) {
      expect((error as { status?: number }).status).toBe(409);
      expect((error as Error).message).toContain("email");
    }
  });

  test("getDoctor returns the doctor or raises 404", async () => {
    const created = await insertDoctor();
    const found = await getDoctor(created.id);
    expect(found.id).toBe(created.id);

    const missingId = "5f8d0d55b54764421b7156c9";
    try {
      await getDoctor(missingId);
      throw new Error("expected 404");
    } catch (error) {
      expect((error as { status?: number }).status).toBe(404);
    }
  });
});

describe("doctors service — deleteDoctor", () => {
  test("unassigns the doctor's patients and keeps their records", async () => {
    const created = await insertDoctor();
    const assignedA = await insertPatient(created.id, "Assigned A");
    const assignedB = await insertPatient(created.id, "Assigned B");
    const unassigned = await insertPatient(null, "Pool Patient");

    await deleteDoctor(created.id);

    expect(await Doctor.countDocuments({})).toBe(0);
    expect(await Patient.countDocuments({})).toBe(3);
    const stillThere = await Patient.findById(assignedA.id).lean();
    expect(stillThere).not.toBeNull();
    expect(stillThere?.doctor).toBeNull();
    const alsoStillThere = await Patient.findById(assignedB.id).lean();
    expect(alsoStillThere?.doctor).toBeNull();
    const pool = await Patient.findById(unassigned.id).lean();
    expect(pool?.doctor).toBeNull();
  });

  test("deleting an unknown doctor raises 404", async () => {
    const missingId = "5f8d0d55b54764421b7156c9";
    try {
      await deleteDoctor(missingId);
      throw new Error("expected 404");
    } catch (error) {
      expect((error as { status?: number }).status).toBe(404);
    }
  });
});

describe("doctors service — explain paths (ADR-0001)", () => {
  test("search, filter, and default sort run against indexes, not a collection scan", async () => {
    // Enough volume that the planner demonstrably picks the indexes over a
    // trivial collection scan.
    const insertManyInput = Array.from({ length: 300 }, (_, i) => ({
      name: `Doctor ${i}`,
      nameLower: `doctor ${i}`,
      specialization: SPECIALIZATIONS[i % SPECIALIZATIONS.length],
      hospital: `Hospital ${i % 5}`,
      hospitalLower: `hospital ${i % 5}`,
      phone: "+1 555-0100",
      email: `doctor${i}@hospital.test`,
      emailLower: `doctor${i}@hospital.test`,
    }));
    await Doctor.insertMany(insertManyInput);

    async function assertIndexScan(filter: Record<string, unknown>) {
      const explain = await Doctor.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(20)
        .explain("executionStats");
      const plan = (explain as { queryPlanner?: { winningPlan?: Record<string, unknown> } }).queryPlanner?.winningPlan;
      expect(plan).toBeDefined();
      const stages: string[] = [];
      const visit = (node: Record<string, unknown> | undefined) => {
        if (!node) return;
        if (typeof node.stage === "string") stages.push(node.stage);
        const input = node.inputStage as Record<string, unknown> | undefined;
        if (input) visit(input);
        // $or plans carry per-clause branch plans in inputStages.
        const branches = node.inputStages as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(branches)) branches.forEach(visit);
        const shards = node.shards as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(shards)) shards.forEach(visit);
      };
      visit(plan);
      expect(stages).toContain("IXSCAN");
      expect(stages).not.toContain("COLLSCAN");
    }

    await assertIndexScan({ $or: [{ nameLower: /^doc/ }, { emailLower: /^doc/ }] });
    await assertIndexScan({ specialization: SPECIALIZATIONS[0] as string });
    await assertIndexScan({ hospitalLower: /^hospital 1/ });
    await assertIndexScan({ createdAt: { $gte: new Date("2026-01-01") } });
    await assertIndexScan({});
  });
});
