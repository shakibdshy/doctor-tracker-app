"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@doctor-tracker-app/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@doctor-tracker-app/ui/components/dialog";
import { Input } from "@doctor-tracker-app/ui/components/input";
import { Label } from "@doctor-tracker-app/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@doctor-tracker-app/ui/components/select";
import { SPECIALIZATIONS } from "@doctor-tracker-app/db/schemas/enums";
import {
  doctorCreateSchema,
  type DoctorCreateInput,
} from "@doctor-tracker-app/db/schemas/doctor";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { apiErrorMessage } from "@/lib/api";

import { createDoctor, updateDoctor, type Doctor } from "../api";
import { doctorKeys } from "../queries";

export type DoctorFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit mode; absent → create mode. */
  initial?: Doctor | null;
};

const EMPTY_VALUES: DoctorCreateInput = {
  name: "",
  specialization: "Cardiology",
  hospital: "",
  phone: "",
  email: "",
};

/**
 * Create/edit form sharing the API's own Zod schema — client validation and
 * server validation can never drift apart. Duplicate emails surface the
 * server's 409 message as a toast and keep the dialog open.
 */
export function DoctorFormDialog({
  open,
  onOpenChange,
  initial,
}: DoctorFormDialogProps) {
  const queryClient = useQueryClient();
  const editing = Boolean(initial);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<DoctorCreateInput>({
    resolver: zodResolver(doctorCreateSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? {
              name: initial.name,
              specialization: initial.specialization as DoctorCreateInput["specialization"],
              hospital: initial.hospital,
              phone: initial.phone,
              email: initial.email,
            }
          : EMPTY_VALUES,
        // keepFieldsRef writes each mounted input directly; the default reset
        // clears field refs and re-registers a render late, leaving uncontrolled
        // inputs showing the previous record's values.
        { keepFieldsRef: true },
      );
    }
  }, [open, initial, reset]);

  const mutation = useMutation({
    mutationFn: (values: DoctorCreateInput) =>
      initial ? updateDoctor(initial.id, values) : createDoctor(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: doctorKeys.all });
      toast.success(editing ? "Doctor updated" : "Doctor created");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit doctor" : "Add doctor"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the doctor's details below."
              : "New doctors appear in the roster immediately."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => void handleSubmit((values) => mutation.mutate(values))(event)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doctor-name">Name</Label>
            <Input id="doctor-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name ? (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doctor-specialization">Specialization</Label>
            <Controller
              control={control}
              name="specialization"
              render={({ field }) => (
                <Select
                  items={SPECIALIZATIONS.map((item) => ({ value: item, label: item }))}
                  value={field.value}
                  onValueChange={(value) => field.onChange(String(value))}
                >
                  <SelectTrigger id="doctor-specialization">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.specialization ? (
              <p className="text-destructive text-sm">{errors.specialization.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doctor-hospital">Hospital</Label>
            <Input
              id="doctor-hospital"
              aria-invalid={Boolean(errors.hospital)}
              {...register("hospital")}
            />
            {errors.hospital ? (
              <p className="text-destructive text-sm">{errors.hospital.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doctor-phone">Phone</Label>
            <Input
              id="doctor-phone"
              type="tel"
              placeholder="+1 555-0100"
              aria-invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
            {errors.phone ? (
              <p className="text-destructive text-sm">{errors.phone.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doctor-email">Email</Label>
            <Input
              id="doctor-email"
              type="email"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            ) : null}
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
              {mutation.isPending ? "Saving…" : editing ? "Save changes" : "Create doctor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
