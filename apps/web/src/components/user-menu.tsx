"use client";

import { Button } from "@doctor-tracker-app/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@doctor-tracker-app/ui/components/dropdown-menu";
import { Skeleton } from "@doctor-tracker-app/ui/components/skeleton";
import { ChevronDownIcon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import { initialsOf } from "./nav-items";

export default function UserMenu() {
  const router = useRouter();
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
        <DropdownMenuGroup>
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
          <DropdownMenuItem className="text-muted-foreground capitalize">
            {session.user.role}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/login");
                    router.refresh();
                  },
                },
              });
            }}
          >
            <LogOutIcon aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
