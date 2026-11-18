"use client";

import { can, type Capability } from "@doctor-tracker-app/auth/policy";
import { useMemo } from "react";

/**
 * View-level permission surface, derived from the server-resolved role.
 *
 * The role is deliberately NOT read from the client session here: it
 * arrives from `requireSession()` through props, so the first client
 * render already knows it (no hydration flicker, no hidden-then-shown
 * UI) and the server's capability middleware stays the authority. This
 * hook only translates the shared policy matrix into named predicates
 * so views declare "what the viewer may do" instead of calling `can()`
 * with raw capability strings.
 *
 * For gates this catalog doesn't name — and on the server, where hooks
 * don't exist — keep using `can()` from @doctor-tracker-app/auth/policy.
 */
export function usePermissions(role: string | null | undefined) {
  return useMemo(() => {
    /** Raw policy check, for capability-driven surfaces like the NAV config. */
    const allowed = (capability: Capability) => can(role, capability);
    return {
      allowed,
      // Doctors
      canCreateDoctor: allowed("doctor:create"),
      canUpdateDoctor: allowed("doctor:update"),
      canDeleteDoctor: allowed("doctor:delete"),
      // Patients
      canCreatePatient: allowed("patient:create"),
      canUpdatePatient: allowed("patient:update"),
      canAssignPatient: allowed("patient:assign"),
      canDeletePatient: allowed("patient:delete"),
      // Team
      canManageTeam: allowed("team:manage"),
    } as const;
  }, [role]);
}

export type Permissions = ReturnType<typeof usePermissions>;
