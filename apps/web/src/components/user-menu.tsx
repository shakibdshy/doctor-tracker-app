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
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session) {
    // Every page rendering this menu is session-guarded, so this only shows
    // in the instant before the session resolves.
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {session.user.name}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card">
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
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
