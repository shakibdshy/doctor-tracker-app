"use client";

import { can, type Capability } from "@doctor-tracker-app/auth/policy";
import { cn } from "@doctor-tracker-app/ui/lib/utils";
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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <Link href="/dashboard" className="text-base font-semibold whitespace-nowrap">
          Doctor Tracker
        </Link>
        {/* Below sm the nav drops to its own edge-to-edge, horizontally
            scrollable row so the header never widens the document. */}
        <nav
          aria-label="Main navigation"
          className="order-last w-full overflow-x-auto sm:order-none sm:w-auto sm:overflow-visible"
        >
          <div className="flex gap-1">
            {links.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                    active
                      ? "bg-accent font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
