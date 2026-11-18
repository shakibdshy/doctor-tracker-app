"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@doctor-tracker-app/ui/components/button";
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
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { useCreateTeamUser } from "../queries";

export function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useCreateTeamUser(() => onOpenChange(false));

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
