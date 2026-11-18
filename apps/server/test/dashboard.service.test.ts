import { Patient } from "@doctor-tracker-app/db/models/patient.model";
import type { PatientCreateInput } from "@doctor-tracker-app/db/schemas/patient";
import { Doctor } from "@doctor-tracker-app/db/models/doctor.model";
import mongoose from "mongoose";
import { beforeEach, afterEach, describe, expect, test } from "bun:test";

import { createDashboardCache } from "../src/modules/dashboard/cache";
import { computeDashboardSummary } from "../src/modules/dashboard/service";
import { createTestDb, type TestDb } from "./helpers/db";

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await db.teardown();
});

let doctorCounter = 0;

async function insertDoctor(name: string) {
  doctorCounter += 1;
  const email = `doctor${doctorCounter}@hospital.test`;
  return Doctor.create({
    name,
    nameLower: name.toLowerCase(),
    specialization: "Cardiology",
    hospital: "St. Mary General",
    hospitalLower: "st. mary general",
    phone: "+1 555-0100",
    email,
    emailLower: email,
  });
}

async function insertPatient(input: {
  name: string;
  condition?: PatientCreateInput["condition"];
  doctorId?: string | null;
  createdAt?: Date;
}) {
  const patient = await Patient.create({
    name: input.name,
    nameLower: input.name.toLowerCase(),
    phone: "+1 555-0200",
    phoneLower: "+1 555-0200",
    gender: "female",
    dateOfBirth: new Date("1990-01-01"),
    condition: input.condition ?? "Asthma",
    doctor: input.doctorId ? new mongoose.Types.ObjectId(input.doctorId) : null,
  });
  if (input.createdAt) {
    await Patient.collection.updateOne(
      { _id: patient._id as mongoose.Types.ObjectId },
      { $set: { createdAt: input.createdAt } },
    );
  }
  return { id: String(patient._id) };
}

describe("dashboard service — computeDashboardSummary", () => {
  test("computes KPIs, monthly intake buckets, top doctors, and condition mix", async () => {
    const alice = await insertDoctor("Alice");
    const bob = await insertDoctor("Bob");
    // Carol exists only so the KPI reads 3 total doctors.
    await insertDoctor("Carol");

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthsAgo = (months: number, day = 15) =>
      new Date(now.getFullYear(), now.getMonth() - months, day);

    // 5 patients total: 3 assigned to Alice, 1 to Bob, 1 unassigned.
    await insertPatient({ name: "A1", doctorId: alice.id, createdAt: monthsAgo(11) });
    await insertPatient({ name: "A2", doctorId: alice.id, createdAt: monthsAgo(5) });
    await insertPatient({ name: "A3", doctorId: alice.id, createdAt: monthsAgo(1) });
    await insertPatient({ name: "B1", doctorId: bob.id, createdAt: thisMonthStart });
    await insertPatient({
      name: "U1",
      doctorId: null,
      condition: "Migraine",
      createdAt: thisMonthStart,
    });

    // Conditions: A1–A3 and B1 default to Asthma (4); U1 is Migraine (1).
    const summary = await computeDashboardSummary();

    expect(summary.kpis).toEqual({
      totalDoctors: 3,
      totalPatients: 5,
      unassignedPatients: 1,
      newPatientsThisMonth: 2,
    });

    // 12 monthly buckets, oldest first: A1 → bucket 0 (11 months ago),
    // A2 → bucket 6 (5 months ago), A3 → bucket 10 (1 month ago), and the
    // two this-month patients → the last bucket. Other months are zeros.
    expect(summary.monthlyIntake).toHaveLength(12);
    expect(summary.monthlyIntake[0]?.count).toBe(1);
    expect(summary.monthlyIntake[6]?.count).toBe(1);
    expect(summary.monthlyIntake[10]?.count).toBe(1);
    expect(summary.monthlyIntake[11]?.count).toBe(2);
    expect(summary.monthlyIntake[11]?.label).toBeTruthy();
    expect(summary.monthlyIntake[1]?.count).toBe(0);

    // Top doctors ordered by count desc, capped at 8, names resolved.
    expect(summary.patientsPerDoctor).toEqual([
      { doctorId: alice.id, doctorName: "Alice", count: 3 },
      { doctorId: bob.id, doctorName: "Bob", count: 1 },
    ]);

    // Condition breakdown ordered by count desc.
    expect(summary.conditionBreakdown).toEqual([
      { condition: "Asthma", count: 4 },
      { condition: "Migraine", count: 1 },
    ]);
  });

  test("handles an empty database with zeroed buckets and no breakdown", async () => {
    const summary = await computeDashboardSummary();
    expect(summary.kpis).toEqual({
      totalDoctors: 0,
      totalPatients: 0,
      unassignedPatients: 0,
      newPatientsThisMonth: 0,
    });
    expect(summary.monthlyIntake).toHaveLength(12);
    expect(summary.monthlyIntake.every((bucket) => bucket.count === 0)).toBe(true);
    expect(summary.patientsPerDoctor).toEqual([]);
    expect(summary.conditionBreakdown).toEqual([]);
  });

  test("caps patients-per-doctor at the top 8", async () => {
    for (let i = 0; i < 10; i++) {
      const doctor = await insertDoctor(`Doctor ${i}`);
      // Doctor i gets (10 - i) patients → clear descending order.
      for (let p = 0; p < 10 - i; p++) {
        await insertPatient({ name: `P${i}-${p}`, doctorId: doctor.id });
      }
    }
    const { patientsPerDoctor } = await computeDashboardSummary();
    expect(patientsPerDoctor).toHaveLength(8);
    expect(patientsPerDoctor[0]?.count).toBe(10);
    expect(patientsPerDoctor[0]?.doctorName).toBe("Doctor 0");
    expect(patientsPerDoctor[7]?.count).toBe(3);
  });
});

describe("dashboard cache — TTL + generation invalidation", () => {
  function makeCounter(): { compute: () => Promise<{ calls: number }>; count: () => number } {
    let calls = 0;
    return {
      compute: async () => {
        calls += 1;
        return { calls };
      },
      count: () => calls,
    };
  }

  test("reuses the computed summary until the TTL expires", async () => {
    const counter = makeCounter();
    const cache = createDashboardCache(counter.compute, 50);

    await cache.get();
    await cache.get();
    expect(counter.count()).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 60));
    await cache.get();
    expect(counter.count()).toBe(2);
  });

  test("invalidate forces a recompute before the TTL expires", async () => {
    const counter = makeCounter();
    const cache = createDashboardCache(counter.compute, 60_000);

    await cache.get();
    expect(counter.count()).toBe(1);

    cache.invalidate();
    await cache.get();
    expect(counter.count()).toBe(2);
  });

  test("a cached generation survives unrelated invalidations' TTL window", async () => {
    const counter = makeCounter();
    const cache = createDashboardCache(counter.compute, 60_000);

    await cache.get();
    cache.invalidate();
    cache.invalidate();
    await cache.get();
    // Two generation bumps still only need one recompute.
    expect(counter.count()).toBe(2);
    await cache.get();
    expect(counter.count()).toBe(2);
  });
});
