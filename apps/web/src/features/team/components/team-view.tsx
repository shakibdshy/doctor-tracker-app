"use client";

import { Badge } from "@doctor-tracker-app/ui/components/badge";
import { Button } from "@doctor-tracker-app/ui/components/button";
import { Card } from "@doctor-tracker-app/ui/components/card";
import { ConfirmDialog } from "@doctor-tracker-app/ui/components/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@doctor-tracker-app/ui/components/select";
import { Skeleton } from "@doctor-tracker-app/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@doctor-tracker-app/ui/components/table";
import { TEAM_ROLES } from "@doctor-tracker-app/auth/team-user";
import { BanIcon, PlusIcon, ShieldCheckIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { initialsOf } from "@/components/nav-items";

import type { TeamUser } from "../api";
import { useBanTeamUser, useSetTeamRole, useTeamUsers, useUnbanTeamUser } from "../queries";
import { CreateUserDialog } from "./team-form-dialog";

export default function TeamView({ currentUserId }: { currentUserId: string }) {
  const [createOpen, setCreateOpen] = useState(false);

  const usersQuery = useTeamUsers();

  const setRole = useSetTeamRole();
  const ban = useBanTeamUser();
  const unban = useUnbanTeamUser();

  const users = usersQuery.data ?? [];
  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return a.name.localeCompare(b.name);
      }),
    [users, currentUserId],
  );

  const avatar = (user: TeamUser) => (
    <span
      aria-hidden
      className="bg-secondary text-secondary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
    >
      {initialsOf(user.name)}
    </span>
  );

  const roleControl = (user: TeamUser, isSelf: boolean, role: string) =>
    isSelf ? (
      <Badge variant="secondary" className="capitalize">
        {role}
      </Badge>
    ) : (
      <Select
        items={TEAM_ROLES.map((item) => ({ value: item, label: item }))}
        value={role}
        onValueChange={(value) =>
          setRole.mutate({ userId: user.id, role: String(value) })
        }
      >
        <SelectTrigger
          aria-label={`Role for ${user.name}`}
          size="sm"
          className="w-28 capitalize"
          disabled={setRole.isPending}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TEAM_ROLES.map((item) => (
            <SelectItem key={item} value={item} className="capitalize">
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );

  const statusBadge = (user: TeamUser) => (
    <div>
      {user.banned ? (
        <Badge variant="destructive">Banned</Badge>
      ) : (
        <Badge variant="success">Active</Badge>
      )}
      {user.banReason ? (
        <p className="text-muted-foreground mt-1 text-xs">{user.banReason}</p>
      ) : null}
    </div>
  );

  const actionControl = (user: TeamUser, isSelf: boolean) =>
    isSelf ? (
      <ShieldCheckIcon className="text-muted-foreground ml-auto size-4" aria-label="Your own account" />
    ) : user.banned ? (
      <Button
        variant="outline"
        size="sm"
        aria-label={`Unban ${user.name}`}
        onClick={() => unban.mutate(user.id)}
        disabled={unban.isPending}
      >
        Unban
      </Button>
    ) : (
      <ConfirmDialog
        trigger={
          <Button
            variant="destructive"
            size="icon-sm"
            aria-label={`Ban ${user.name}`}
          >
            <BanIcon />
          </Button>
        }
        title={`Ban ${user.name}?`}
        description="Their sessions are revoked immediately and they can no longer sign in until unbanned."
        confirmLabel="Ban user"
        onConfirm={() => ban.mutateAsync(user.id)}
        isPending={ban.isPending}
      />
    );

  const identity = (user: TeamUser, isSelf: boolean) => (
    <div className="min-w-0">
      <span className="block font-medium">
        {user.name}
        {isSelf ? (
          <span className="text-muted-foreground ml-1.5 text-xs">(you)</span>
        ) : null}
      </span>
      <span className="text-muted-foreground block truncate font-mono text-[13px]">
        {user.email}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card shadow-card overflow-hidden rounded-xl ring-1 ring-foreground/8 max-lg:overflow-visible max-lg:bg-transparent max-lg:shadow-none max-lg:ring-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3 max-lg:border-b-0 max-lg:px-0 max-lg:pt-0 max-lg:pb-3">
          <p className="text-muted-foreground text-[13px] tabular-nums">
            {usersQuery.isLoading ? "Loading…" : `${users.length} users`}
          </p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add user
          </Button>
        </div>

        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-3.5 w-48" />
                      </TableCell>
                    </TableRow>
                  ))
                : sortedUsers.map((user) => {
                    const isSelf = user.id === currentUserId;
                    const role = user.role ?? "staff";
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {avatar(user)}
                            {identity(user, isSelf)}
                          </div>
                        </TableCell>
                        <TableCell>{roleControl(user, isSelf, role)}</TableCell>
                        <TableCell>{statusBadge(user)}</TableCell>
                        <TableCell className="text-right">
                          {actionControl(user, isSelf)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 lg:hidden">
          {usersQuery.isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))
            : sortedUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                const role = user.role ?? "staff";
                return (
                  <Card key={user.id} className="gap-3 p-4">
                    <div className="flex items-start gap-3">
                      {avatar(user)}
                      <div className="min-w-0 flex-1">{identity(user, isSelf)}</div>
                      {statusBadge(user)}
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                      {roleControl(user, isSelf, role)}
                      {actionControl(user, isSelf)}
                    </div>
                  </Card>
                );
              })}
        </div>

        {!usersQuery.isLoading && users.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm max-lg:px-0">
            No users yet — add the first teammate.
          </p>
        ) : null}
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
