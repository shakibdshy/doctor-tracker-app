"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@doctor-tracker-app/ui/components/badge";
import { Button } from "@doctor-tracker-app/ui/components/button";
import { Card } from "@doctor-tracker-app/ui/components/card";
import { ConfirmDialog } from "@doctor-tracker-app/ui/components/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@doctor-tracker-app/ui/components/dialog";
import { Input } from "@doctor-tracker-app/ui/components/input";
import { Label } from "@doctor-tracker-app/ui/components/label";
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
import { TEAM_ROLES, teamUserCreateSchema, type TeamUserCreateInput } from "@doctor-tracker-app/auth/team-user";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BanIcon, PlusIcon, ShieldCheckIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { initialsOf } from "@/components/nav-items";

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
  banned: boolean | null;
  banReason?: string | null;
  createdAt: string;
};

function errorMessage(error: { message?: string } | null | undefined): string {
  return error?.message ?? "Something went wrong. Please try again.";
}

export default function TeamView({ currentUserId }: { currentUserId: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const { data, error } = await authClient.admin.listUsers({
        query: { limit: 100, sortBy: "createdAt", sortDirection: "desc" },
      });
      if (error) throw new Error(errorMessage(error));
      return (data?.users ?? []) as unknown as TeamUser[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["team"] });

  const setRole = useMutation({
    mutationFn: async (input: { userId: string; role: TeamUser["role"] }) => {
      const { error } = await authClient.admin.setRole({
        userId: input.userId,
        role: input.role as "admin" | "staff",
      });
      if (error) throw new Error(errorMessage(error));
    },
    onSuccess: () => {
      toast.success("Role updated");
      void invalidate();
    },
    onError: (roleError) => toast.error(roleError instanceof Error ? roleError.message : undefined),
  });

  const ban = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await authClient.admin.banUser({
        userId,
        banReason: "Access revoked by an administrator",
      });
      if (error) throw new Error(errorMessage(error));
    },
    onSuccess: () => {
      toast.success("User banned — their sessions were revoked");
      void invalidate();
    },
    onError: (banError) => toast.error(banError instanceof Error ? banError.message : undefined),
  });

  const unban = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await authClient.admin.unbanUser({ userId });
      if (error) throw new Error(errorMessage(error));
    },
    onSuccess: () => {
      toast.success("User reinstated — they can sign in again");
      void invalidate();
    },
    onError: (unbanError) => toast.error(unbanError instanceof Error ? unbanError.message : undefined),
  });

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

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<TeamUserCreateInput>({
    resolver: zodResolver(teamUserCreateSchema),
    defaultValues: { name: "", email: "", password: "", role: "staff" },
  });

  useEffect(() => {
    if (open) {
      // keepFieldsRef writes each mounted input directly so reopening the
      // dialog clears prior typed values instead of showing them a render late.
      reset({ name: "", email: "", password: "", role: "staff" }, { keepFieldsRef: true });
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: async (values: TeamUserCreateInput) => {
      const { error } = await authClient.admin.createUser(values);
      if (error) throw new Error(errorMessage(error));
    },
    onSuccess: () => {
      toast.success("User created — they can sign in with the provisioned credentials");
      void queryClient.invalidateQueries({ queryKey: ["team"] });
      onOpenChange(false);
    },
    onError: (createError) =>
      toast.error(createError instanceof Error ? createError.message : undefined),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Provision credentials directly — there is no public sign-up path.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => void handleSubmit((values) => mutation.mutate(values))(event)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-user-name">Name</Label>
            <Input id="team-user-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-user-email">Email</Label>
            <Input
              id="team-user-email"
              type="email"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-user-password">Password</Label>
            <Input
              id="team-user-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-destructive text-sm">{errors.password.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-user-role">Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  items={TEAM_ROLES.map((item) => ({ value: item, label: item }))}
                  value={field.value}
                  onValueChange={(value) => field.onChange(String(value))}
                >
                  <SelectTrigger id="team-user-role" className="capitalize">
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
              )}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
