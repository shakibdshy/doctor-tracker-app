import type { Capability } from "@doctor-tracker-app/auth/policy";
import {
  HeartPulseIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";

// The UI only reveals what the role can do; the server's permission policy
// remains the authority (same matrix, packages/auth/src/policy.ts).
export const NAV: ReadonlyArray<{
  href: Route;
  label: string;
  capability: Capability;
  icon: LucideIcon;
}> = [
  { href: "/dashboard", label: "Dashboard", capability: "dashboard:read", icon: LayoutDashboardIcon },
  { href: "/doctors", label: "Doctors", capability: "doctor:read", icon: StethoscopeIcon },
  { href: "/patients", label: "Patients", capability: "patient:read", icon: HeartPulseIcon },
  { href: "/team", label: "Team", capability: "team:manage", icon: ShieldCheckIcon },
];