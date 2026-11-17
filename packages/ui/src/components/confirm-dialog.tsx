"use client";

import { cn } from "@doctor-tracker-app/ui/lib/utils";
import { Spinner } from "@doctor-tracker-app/ui/components/spinner";
import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import { Button, buttonVariants } from "./button";

export type ConfirmDialogProps = {
  /** The control that opens the dialog (usually a destructive Button). */
  trigger: React.ReactElement<{ disabled?: boolean }>;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * Resolves the dialog. On resolve the dialog closes; on rejection the
   * dialog stays open and `onError` is invoked — surface a toast there.
   */
  onConfirm: () => Promise<unknown> | unknown;
  /** Called when `onConfirm` rejects. Show the failure toast here. */
  onError?: (error: unknown) => void;
  /** Shows the spinner and disables the confirm action. */
  isPending?: boolean;
  className?: string;
};

/**
 * Guard for destructive operations (patient Delete, doctor Delete). The
 * confirm button keeps Base-UI's native focus trap and Escape semantics;
 * closing is driven by the awaited `onConfirm` resolving.
 */
function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onError,
  isPending,
  className,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const busy = isPending ?? pending;

  const handleConfirm = async (event: React.MouseEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (error) {
      // Keep the dialog open; the page decides how to surface the failure.
      onError?.(error);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent className={className}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            render={<Button variant="outline" disabled={busy} />}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => void handleConfirm(event)}
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={busy}
          >
            {busy ? <Spinner data-icon="inline-start" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmDialog };
