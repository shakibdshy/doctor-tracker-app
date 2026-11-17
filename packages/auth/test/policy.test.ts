import { describe, expect, test } from "bun:test";

import { can, capabilities } from "../src/policy";

// Expected values are literals from the spec's role definitions (GLOSSARY.md):
// Admin has full access; Staff views everything, manages patients and their
// assignments, and may never delete patients, mutate doctors, or manage the team.
const ALL_CAPABILITIES = [
  "doctor:read",
  "doctor:create",
  "doctor:update",
  "doctor:delete",
  "patient:read",
  "patient:create",
  "patient:update",
  "patient:assign",
  "patient:delete",
  "dashboard:read",
  "team:manage",
] as const;

const STAFF_ALLOWED = new Set<string>([
  "doctor:read",
  "patient:read",
  "patient:create",
  "patient:update",
  "patient:assign",
  "dashboard:read",
]);

describe("permission policy", () => {
  test("exposes the full capability list the portal enforces", () => {
    expect([...capabilities].sort()).toEqual([...ALL_CAPABILITIES].sort());
  });

  test("Admin is allowed every capability", () => {
    for (const capability of ALL_CAPABILITIES) {
      expect(can("admin", capability)).toBe(true);
    }
  });

  test("Staff is allowed exactly the patient-workflow capabilities", () => {
    for (const capability of ALL_CAPABILITIES) {
      // Wrap in one string so a failure names the offending capability.
      expect(`${capability}=${can("staff", capability)}`).toBe(
        `${capability}=${STAFF_ALLOWED.has(capability)}`,
      );
    }
  });

  test("denies unknown roles, missing roles, and unknown capabilities", () => {
    expect(can("unknown-role", "doctor:create")).toBe(false);
    expect(can(undefined, "doctor:create")).toBe(false);
    // @ts-expect-error — unknown capability must also be rejected at runtime
    expect(can("admin", "patient:resurrect")).toBe(false);
  });
});
