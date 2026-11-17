"use client";

import { Badge } from "@doctor-tracker-app/ui/components/badge";
import { Button } from "@doctor-tracker-app/ui/components/button";
import { Card } from "@doctor-tracker-app/ui/components/card";
import { ConfirmDialog } from "@doctor-tracker-app/ui/components/confirm-dialog";
import { UnlinkIcon } from "lucide-react";

import { dateFormatter } from "@/lib/format";
import type { Patient } from "@/lib/api";

export type PatientCardProps = {
  patient: Patient;
  /** Can the viewer unassign this patient? */
  canAssign: boolean;
  /** Called with the confirmed patient; the parent owns the mutation. */
  onUnassign: (patient: Patient) => Promise<unknown>;
  unassignPending?: boolean;
};

/**
 * The mobile (<md) rendering of a patient row, shared by the patients page
 * and the doctor-detail patient list.
 */
export function PatientCard({
  patient,
  canAssign,
  onUnassign,
  unassignPending,
}: PatientCardProps) {
  return (
    <Card className="gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-medium">{patient.name}</span>
          <p className="text-muted-foreground text-sm">{patient.phone}</p>
        </div>
        <Badge variant="outline">{patient.condition}</Badge>
      </div>
      <div className="text-muted-foreground text-sm">
        <p className="capitalize">{patient.gender}</p>
        <p className="tabular-nums">Born {dateFormatter.format(new Date(patient.dateOfBirth))}</p>
        <p>
          {patient.doctor ? (
            <>Doctor: {patient.doctor.name}</>
          ) : (
            <span className="italic">Unassigned</span>
          )}
        </p>
        <p className="tabular-nums">Added {dateFormatter.format(new Date(patient.createdAt))}</p>
      </div>
      {canAssign && patient.doctor ? (
        <div className="flex items-center justify-end border-t pt-2">
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
        </div>
      ) : null}
    </Card>
  );
}
