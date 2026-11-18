"use client";

import { cn } from "@doctor-tracker-app/ui/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@doctor-tracker-app/ui/components/dropdown-menu";
import { ChevronsUpDownIcon, StethoscopeIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { initialsOf } from "@/lib/format";
import { usePermissions } from "@/lib/use-permissions";

import { AccountMenuItems } from "./account-menu";
import { ModeToggle } from "./mode-toggle";
import { NAV } from "./nav-items";

/**
 * Desktop navigation rail: deep-pine panel with the serif wordmark,
 * role-filtered icon nav, and the account controls pinned to the bottom.
 * Hidden below md, where the mobile header takes over.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const { allowed } = usePermissions(session?.user.role);

  const links = NAV.filter((item) => allowed(item.capability));

  return (
    <aside className="grain bg-sidebar text-sidebar-foreground relative hidden w-64 shrink-0 flex-col md:flex">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
          <StethoscopeIcon aria-hidden className="size-4.5" />
        </span>
        <Link href="/dashboard" className="min-w-0">
          <span className="font-display block text-lg leading-tight font-semibold tracking-tight whitespace-nowrap">
            Doctor Tracker
          </span>
          <span className="text-sidebar-foreground/55 block text-[10px] font-semibold tracking-[0.14em] uppercase">
            Admin portal
          </span>
        </Link>
      </div>

      <nav aria-label="Main navigation" className="flex-1 px-3 py-2">
        <p className="text-sidebar-foreground/45 px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] uppercase">
          Workspace
        </p>
        <div className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                {label}
                {active ? (
                  <span className="bg-sidebar-primary ml-auto size-1.5 rounded-full" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-sidebar-border flex items-center gap-1 border-t px-3 py-3">
        {session ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="hover:bg-sidebar-accent focus-visible:ring-sidebar-ring/40 flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors outline-none focus-visible:ring-2"
              aria-label={`Account menu for ${session.user.name}`}
            >
              <span className="bg-sidebar-accent text-sidebar-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {initialsOf(session.user.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {session.user.name}
                </span>
                <span className="text-sidebar-foreground/55 block truncate text-xs capitalize">
                  {session.user.role}
                </span>
              </span>
              <ChevronsUpDownIcon aria-hidden className="text-sidebar-foreground/50 size-3.5 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="min-w-52">
              <AccountMenuItems email={session.user.email} role={session.user.role} />
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="h-11 flex-1" />
        )}
        <ModeToggle
          variant="ghost"
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        />
      </div>
    </aside>
  );
}