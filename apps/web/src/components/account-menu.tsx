"use client";

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@doctor-tracker-app/ui/components/dropdown-menu";
import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

/**
 * The shared body of the account dropdowns: identity readout and sign-out.
 * The sidebar (desktop rail) and the mobile header UserMenu render their
 * own triggers but share this content — one implementation of sign-out.
 */
export function AccountMenuItems({
  email,
  role,
}: {
  email: string;
  /** better-auth stores the role and may resolve it as null. */
  role?: string | null | undefined;
}) {
  const router = useRouter();

  const signOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  };

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>My account</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem>{email}</DropdownMenuItem>
      {role ? (
        <DropdownMenuItem className="text-muted-foreground capitalize">{role}</DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={signOut}>
        <LogOutIcon aria-hidden />
        Sign out
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}
