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
import { Textarea } from "@doctor-tracker-app/ui/components/textarea";
import { CONDITIONS, GENDERS } from "@doctor-tracker-app/db/schemas/enums";
import {
  patientCreateSchema,
  type PatientCreateInput,
} from "@doctor-tracker-app/db/schemas/patient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { toast } from "sonner";

import { apiFetch, type Doctor, type Patient } from "@/lib/api";

const NO_DOCTOR = "none";

const EMPTY_PATIENT = {
  name: "",
  phone: "",
  gender: "female" as const,
  dateOfBirth: "2000-01-01",
  condition: "Asthma" as const,
  doctor: null,
  doctorId: null,
  notes: "",
};

type PatientFormInput = z.input<typeof patientCreateSchema>;
type PatientFormOutput = z.output<typeof patientCreateSchema>;

export type PatientFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit mode; absent → create mode. */
  initial?: Patient | null;
  /** Set by "Add patient" under a specific doctor — assignment is locked. */
  lockedDoctor?: Doctor | null;
  /** Roster options for the assignment select (not needed when locked). */
  doctors?: Doctor[];
};

/**
 * Create/edit form sharing the API's own Zod schema. Assignment and
 * reassignment happen here: pick a doctor (or none). With `lockedDoctor`,
 * the new patient is pre-assigned to that doctor.
 */
export function PatientFormDialog({
  open,
  onOpenChange,
  initial,
  lockedDoctor,
  doctors = [],
}: PatientFormDialogProps) {
  const queryClient = useQueryClient();
  const editing = Boolean(initial);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PatientFormInput, unknown, PatientFormOutput>({
    resolver: zodResolver(patientCreateSchema),
    defaultValues: {
      name: "",
      phone: "",
      gender: "female",
      dateOfBirth: "",
      condition: "Asthma",
      doctorId: lockedDoctor?.id ?? null,
      notes: "",
    },
  });

  // List rows omit notes (list projections render table fields only), so
  // editing fetches the full record — otherwise saving would wipe notes.
  const detailQuery = useQuery({
    queryKey: ["patient", initial?.id],
    queryFn: () => apiFetch<Patient>(`/api/v1/patients/${initial?.id}`),
    enabled: open && Boolean(initial),
  });
  const full = initial
    ? (detailQuery.data?.data ?? null)
    : { ...EMPTY_PATIENT, doctorId: lockedDoctor?.id ?? null };
  const waitingForRecord = Boolean(initial) && detailQuery.isLoading;

  useEffect(() => {
    if (!open) return;
    // Editing seeds only from the fetched record — never from the
    // notes-less list row — so a save can't blank stored notes.
    if (initial && (detailQuery.isLoading || detailQuery.isError)) return;
    reset(
      full
        ? {
            name: full.name,
            phone: full.phone,
            gender: full.gender as PatientFormInput["gender"],
            dateOfBirth: full.dateOfBirth.slice(0, 10),
            condition: full.condition as PatientFormInput["condition"],
            doctorId: full.doctor?.id ?? null,
            notes: full.notes ?? "",
          }
        : {
            name: "",
            phone: "",
            gender: "female",
            dateOfBirth: "",
            condition: "Asthma",
            doctorId: lockedDoctor?.id ?? null,
            notes: "",
          },
    );
  }, [open, initial, detailQuery.isLoading, detailQuery.isError, full, lockedDoctor, reset]);

  const mutation = useMutation({
    mutationFn: (values: PatientFormOutput) => {
      const payload: PatientCreateInput = {
        ...values,
        // A locked dialog always assigns to its doctor.
        doctorId: lockedDoctor ? lockedDoctor.id : (values.doctorId ?? null),
      };
      const path = initial ? `/api/v1/patients/${initial.id}` : "/api/v1/patients";
      return apiFetch<Patient>(path, {
        method: initial ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_result, _values, _context) => {
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success(editing ? "Patient updated" : "Patient created");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Unable to save the patient. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing
              ? "Edit patient"
              : lockedDoctor
                ? `Add patient under ${lockedDoctor.name}`
                : "Add patient"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update details or reassign the patient below."
              : lockedDoctor
                ? "The new patient is assigned to this doctor."
                : "Assign a doctor now or leave the patient unassigned."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => void handleSubmit((values) => mutation.mutate(values))(event)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="patient-name">Name</Label>
            <Input id="patient-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name ? (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="patient-phone">Phone</Label>
              <Input
                id="patient-phone"
                type="tel"
                placeholder="+1 555-0200"
                aria-invalid={Boolean(errors.phone)}
                {...register("phone")}
              />
              {errors.phone ? (
                <p className="text-destructive text-sm">{errors.phone.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="patient-gender">Gender</Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select
                    items={GENDERS.map((item) => ({ value: item, label: item }))}
                    value={field.value}
                    onValueChange={(value) => field.onChange(String(value))}
                  >
                    <SelectTrigger id="patient-gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="patient-dob">Date of birth</Label>
              <Input
                id="patient-dob"
                type="date"
                aria-invalid={Boolean(errors.dateOfBirth)}
                {...register("dateOfBirth")}
              />
              {errors.dateOfBirth ? (
                <p className="text-destructive text-sm">{errors.dateOfBirth.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="patient-condition">Condition</Label>
              <Controller
                control={control}
                name="condition"
                render={({ field }) => (
                  <Select
                    items={CONDITIONS.map((item) => ({ value: item, label: item }))}
                    value={field.value}
                    onValueChange={(value) => field.onChange(String(value))}
                  >
                    <SelectTrigger id="patient-condition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="patient-doctor">Doctor</Label>
            {lockedDoctor ? (
              <Input id="patient-doctor" value={lockedDoctor.name} disabled readOnly />
            ) : (
              <Controller
                control={control}
                name="doctorId"
                render={({ field }) => (
                  <Select
                    items={[
                      { value: NO_DOCTOR, label: "No doctor (unassigned pool)" },
                      ...doctors.map((doctor) => ({
                        value: doctor.id,
                        label: `${doctor.name} — ${doctor.hospital}`,
                      })),
                    ]}
                    value={field.value ?? NO_DOCTOR}
                    onValueChange={(value) =>
                      field.onChange(value === NO_DOCTOR ? null : String(value))
                    }
                  >
                    <SelectTrigger id="patient-doctor">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_DOCTOR}>No doctor (unassigned pool)</SelectItem>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name} — {doctor.hospital}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="patient-notes">Notes (optional)</Label>
            <Textarea id="patient-notes" rows={3} {...register("notes")} />
            {errors.notes ? (
              <p className="text-destructive text-sm">{errors.notes.message}</p>
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
            <Button
              type="submit"
              // Editing waits for the full record so notes can't be wiped by
              // saving before the fetch resolves.
              disabled={mutation.isPending || (editing && (detailQuery.isLoading || detailQuery.isError))}
            >
              {mutation.isPending
                ? "Saving…"
                : editing && (detailQuery.isLoading || detailQuery.isError)
                  ? "Loading…"
                  : editing
                    ? "Save changes"
                    : "Create patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
