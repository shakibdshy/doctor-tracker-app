"use client";

import { Badge } from "@doctor-tracker-app/ui/components/badge";
import { Button } from "@doctor-tracker-app/ui/components/button";
import { Card } from "@doctor-tracker-app/ui/components/card";
import { ConfirmDialog } from "@doctor-tracker-app/ui/components/confirm-dialog";
import { PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { apiErrorMessage } from "@/lib/api";
import { dateFormatter } from "@/lib/format";

import type { Doctor } from "../api";

export type DoctorCardProps = {
  doctor: Doctor;
  canUpdate: boolean;
  canDelete: boolean;
  /** Called on Edit; the parent owns the dialog state. */
  onEdit: (doctor: Doctor) => void;
  /** Called with the confirmed doctor; the parent owns the mutation. */
  onDelete: (doctor: Doctor) => Promise<unknown>;
  deletePending: boolean;
};

/** The mobile/tablet (<lg) rendering of a doctor row on the doctors page. */
export function DoctorCard({
  doctor,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  deletePending,
}: DoctorCardProps) {
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/doctors/${doctor.id}`}
            className="text-[15px] font-semibold underline-offset-4 hover:text-primary hover:underline"
          >
            {doctor.name}
          </Link>
          <p className="text-muted-foreground truncate text-[13px]">{doctor.hospital}</p>
        </div>
        <Badge variant="secondary">{doctor.specialization}</Badge>
      </div>
      <div className="text-muted-foreground space-y-0.5 font-mono text-[13px]">
        <p>{doctor.phone}</p>
        <p className="truncate">{doctor.email}</p>
        <p className="tabular-nums">Added {dateFormatter.format(new Date(doctor.createdAt))}</p>
      </div>
      {canUpdate || canDelete ? (
        <div className="flex items-center justify-end gap-1 border-t border-border/60 pt-2.5">
          {canUpdate ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(doctor)}
            >
              <PencilIcon data-icon="inline-start" />
              Edit
            </Button>
          ) : null}
          {canDelete ? (
            <ConfirmDialog
              trigger={
                <Button variant="destructive" size="sm">
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </Button>
              }
              title={`Delete ${doctor.name}?`}
              description="The doctor is deleted from the roster and their patients become unassigned. This cannot be undone."
              confirmLabel="Delete doctor"
              onConfirm={() => onDelete(doctor)}
              isPending={deletePending}
              onError={(deleteError: unknown) => toast.error(apiErrorMessage(deleteError))}
            />
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
