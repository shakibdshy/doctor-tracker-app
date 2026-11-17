"use client";

import { can, type Capability } from "@doctor-tracker-app/auth/policy";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { authClient } from "@/lib/auth-client";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

// The UI only reveals what the role can do; the server's permission policy
// remains the authority (same matrix, packages/auth/src/policy.ts).
const NAV: ReadonlyArray<{ href: Route; label: string; capability: Capability }> = [
  { href: "/dashboard", label: "Dashboard", capability: "dashboard:read" },
  { href: "/doctors", label: "Doctors", capability: "doctor:read" },
  { href: "/patients", label: "Patients", capability: "patient:read" },
  { href: "/team", label: "Team", capability: "team:manage" },
];

export default function Header() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  const links = NAV.filter((item) => can(session?.user.role, item.capability));

  return (
    <header className="border-b">
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-base font-semibold">
            Doctor Tracker
          </Link>
          <nav aria-label="Main navigation" className="flex gap-1">
            {links.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-accent font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
