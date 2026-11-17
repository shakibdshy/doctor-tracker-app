import { describe, expect, test } from "bun:test";

import {
  doctorCreateSchema,
  doctorListQuerySchema,
} from "@doctor-tracker-app/db/schemas/doctor";

describe("doctor list query schema", () => {
  test("caps page size at 100 regardless of client input", () => {
    const parsed = doctorListQuerySchema.parse({ limit: "500" });
    expect(parsed.limit).toBe(100);
    const huge = doctorListQuerySchema.parse({ limit: "100000" });
    expect(huge.limit).toBe(100);
  });

  test("applies positive-integer defaults and coerces strings", () => {
    const parsed = doctorListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);

    const coerced = doctorListQuerySchema.parse({ page: "3", limit: "25" });
    expect(coerced.page).toBe(3);
    expect(coerced.limit).toBe(25);
  });

  test("rejects non-positive integers and unknown operator keys", () => {
    expect(() => doctorListQuerySchema.parse({ page: "0" })).toThrow();
    expect(() => doctorListQuerySchema.parse({ limit: "-5" })).toThrow();
    expect(() => doctorListQuerySchema.parse({ limit: "1.5" })).toThrow();
    // Operator-injection payloads are rejected by the strict shape, never
    // passed through to the database.
    expect(() => doctorListQuerySchema.parse({ $gt: 1 })).toThrow();
    expect(() => doctorListQuerySchema.parse({ search: { $regex: ".*" } })).toThrow();
    expect(() => doctorListQuerySchema.parse({ notAField: "x" })).toThrow();
  });

  test("rejects values outside the fixed specialization list", () => {
    expect(() => doctorListQuerySchema.parse({ specialization: "Surgery" })).toThrow();
    const ok = doctorListQuerySchema.parse({ specialization: "Cardiology" });
    expect(ok.specialization).toBe("Cardiology");
  });
});

describe("doctor create schema", () => {
  test("normalizes email to lowercase and rejects malformed records", () => {
    const parsed = doctorCreateSchema.parse({
      name: "  Padded Name  ",
      specialization: "Neurology",
      hospital: "Riverside",
      phone: "+1 555-0100",
      email: "  DoCtor@HOSPITAL.test ",
    });
    expect(parsed.email).toBe("doctor@hospital.test");
    expect(parsed.name).toBe("Padded Name");

    expect(() =>
      doctorCreateSchema.parse({
        name: "",
        specialization: "Neurology",
        hospital: "Riverside",
        phone: "+1 555-0100",
        email: "doctor@hospital.test",
      }),
    ).toThrow();
    expect(() =>
      doctorCreateSchema.parse({
        name: "X",
        specialization: "Neurology",
        hospital: "Riverside",
        phone: "abc",
        email: "doctor@hospital.test",
      }),
    ).toThrow();
    expect(() =>
      doctorCreateSchema.parse({
        name: "X",
        specialization: "Neurology",
        hospital: "Riverside",
        phone: "+1 555-0100",
        email: "not-an-email",
      }),
    ).toThrow();
  });
});
