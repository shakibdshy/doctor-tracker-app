"use client";

import { Badge } from "@doctor-tracker-app/ui/components/badge";
import { Button } from "@doctor-tracker-app/ui/components/button";
import { Card } from "@doctor-tracker-app/ui/components/card";
import { ConfirmDialog } from "@doctor-tracker-app/ui/components/confirm-dialog";
import { PencilIcon, Trash2Icon, UnlinkIcon } from "lucide-react";
import { toast } from "sonner";

import { apiErrorMessage } from "@/lib/api";
import { dateFormatter } from "@/lib/format";

import type { Patient } from "../api";

export type PatientCardProps = {
  patient: Patient;
  /** Can the viewer unassign this patient? */
  canAssign: boolean;
  /** Called with the confirmed patient; the parent owns the mutation. */
  onUnassign: (patient: Patient) => Promise<unknown>;
  unassignPending?: boolean;
  /** Provided only where editing is in scope (patients page, not doctor detail). */
  onEdit?: (patient: Patient) => void;
  onDelete?: (patient: Patient) => Promise<unknown>;
  deletePending?: boolean;
};

/**
 * The mobile/tablet (<lg) rendering of a patient row, shared by the patients
 * page and the doctor-detail patient list.
 */
export function PatientCard({
  patient,
  canAssign,
  onUnassign,
  unassignPending,
  onEdit,
  onDelete,
  deletePending,
}: PatientCardProps) {
  const showUnassign = canAssign && patient.doctor;
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span data-slot="patient-name" className="text-[15px] font-semibold">{patient.name}</span>
          <p className="text-muted-foreground font-mono text-[13px]">{patient.phone}</p>
        </div>
        <Badge variant="outline">{patient.condition}</Badge>
      </div>
      <div className="text-muted-foreground space-y-0.5 text-[13px]">
        <p className="capitalize">{patient.gender}</p>
        <p className="font-mono tabular-nums">Born {dateFormatter.format(new Date(patient.dateOfBirth))}</p>
        <p>
          {patient.doctor ? (
            <>Doctor: {patient.doctor.name}</>
          ) : (
            <span className="italic">Unassigned</span>
          )}
        </p>
        <p className="font-mono tabular-nums">Added {dateFormatter.format(new Date(patient.createdAt))}</p>
      </div>
      {showUnassign || onEdit || onDelete ? (
        <div className="flex items-center justify-end gap-1 border-t border-border/60 pt-2.5">
          {showUnassign ? (
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm">
                  <UnlinkIcon data-icon="inline-start" />
                  Unassign
                </Button>
              }
              title={`Unassign ${patient.name}?`}
              description="The patient keeps their record and joins the unassigned pool."
              confirmLabel="Unassign patient"
              onConfirm={() => onUnassign(patient)}
              isPending={unassignPending}
            />
          ) : null}
          {onEdit ? (
            <Button variant="ghost" size="sm" onClick={() => onEdit(patient)}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Button>
          ) : null}
          {onDelete ? (
            <ConfirmDialog
              trigger={
                <Button variant="destructive" size="sm">
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </Button>
              }
              title={`Delete ${patient.name}?`}
              description="The patient record is permanently deleted. To keep the record, unassign instead."
              confirmLabel="Delete patient"
              onConfirm={() => onDelete(patient)}
              isPending={deletePending}
              onError={(deleteError: unknown) => toast.error(apiErrorMessage(deleteError))}
            />
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
