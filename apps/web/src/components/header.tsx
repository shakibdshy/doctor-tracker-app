"use client";

import { can } from "@doctor-tracker-app/auth/policy";
import { cn } from "@doctor-tracker-app/ui/lib/utils";
import { StethoscopeIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import { ModeToggle } from "./mode-toggle";
import { NAV } from "./nav-items";
import UserMenu from "./user-menu";

/**
 * Mobile top bar (below md): brand row with theme + account controls, and
 * an edge-to-edge scrollable pill nav so the header never widens the page.
 */
export default function Header() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  const links = NAV.filter((item) => can(session?.user.role, item.capability));

  return (
    <header className="border-border/70 bg-card/85 border-b backdrop-blur-sm md:hidden">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
          <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
            <StethoscopeIcon aria-hidden className="size-4" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight whitespace-nowrap">
            Doctor Tracker
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <nav
        aria-label="Main navigation"
        className="overflow-x-auto px-4 pb-2.5"
      >
        <div className="flex w-max gap-1.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}