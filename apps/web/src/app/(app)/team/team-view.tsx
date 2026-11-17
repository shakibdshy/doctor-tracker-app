"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@doctor-tracker-app/ui/components/badge";
import { Button } from "@doctor-tracker-app/ui/components/button";
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
import { TEAM_ROLES, teamUserCreateSchema, type TeamUserCreateInput } from "@doctor-tracker-app/auth/team-user";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BanIcon, PlusIcon, ShieldCheckIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {usersQuery.isLoading ? "Loading…" : `${users.length} users`}
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Add user
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full caption-bottom text-xs">
          <thead>
            <tr className="border-b">
              <th className="h-10 px-3 text-left font-medium">User</th>
              <th className="h-10 px-3 text-left font-medium">Role</th>
              <th className="h-10 px-3 text-left font-medium">Status</th>
              <th className="h-10 px-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={4} className="h-12 px-3">
                      <div className="bg-muted h-3.5 w-48 animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              : sortedUsers.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const role = user.role ?? "staff";
                  return (
                    <tr key={user.id} className="border-b transition-colors last:border-b-0 hover:bg-muted/50">
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {user.name}
                            {isSelf ? (
                              <span className="text-muted-foreground ml-1.5 text-xs">(you)</span>
                            ) : null}
                          </span>
                          <span className="text-muted-foreground">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {isSelf ? (
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
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {user.banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                        {user.banReason ? (
                          <p className="text-muted-foreground mt-1 text-xs">{user.banReason}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {isSelf ? (
                          <ShieldCheckIcon className="text-muted-foreground ml-auto size-4" aria-label="Your own account" />
                        ) : user.banned ? (
                          <Button
                            variant="outline"
                            size="sm"
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
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!usersQuery.isLoading && users.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
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
      reset({ name: "", email: "", password: "", role: "staff" });
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
