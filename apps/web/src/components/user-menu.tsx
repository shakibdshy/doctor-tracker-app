"use client";

import { Button } from "@doctor-tracker-app/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@doctor-tracker-app/ui/components/dropdown-menu";
import { Skeleton } from "@doctor-tracker-app/ui/components/skeleton";
import { ChevronDownIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";

import { AccountMenuItems } from "./account-menu";
import { initialsOf } from "./nav-items";

export default function UserMenu() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-9 w-32" />;
  }

  if (!session) {
    // Every page rendering this menu is session-guarded, so this only shows
    // in the instant before the session resolves.
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="max-w-40 gap-2 pl-1.5" />}
      >
        <span
          aria-hidden
          className="bg-secondary text-secondary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
        >
          {initialsOf(session.user.name)}
        </span>
        <span className="truncate">{session.user.name}</span>
        <ChevronDownIcon aria-hidden className="text-muted-foreground size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52 bg-card">
        <AccountMenuItems email={session.user.email} role={session.user.role} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
