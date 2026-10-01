"use client";

import type { FormEvent, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAdminAction } from "@/hooks/use-admin-action";
import type { ActionResult } from "@/lib/admin/action";

type RequestDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  canSubmit: boolean;
  onSubmit: () => Promise<ActionResult<unknown>>;
  onClose: () => void;
  children: ReactNode;
};

/** A small form in a dialog. Mount it only while it is open, so every opening starts empty;
 *  it stays open and shows the error when the action fails. */
export function RequestDialog({
  title,
  description,
  confirmLabel,
  canSubmit,
  onSubmit,
  onClose,
  children,
}: RequestDialogProps) {
  const { run, isPending, error } = useAdminAction();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || isPending) return;
    if (await run(onSubmit)) onClose();
  }

  return (
    <AlertDialog
      isOpen
      isDismissable={!isPending}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {children}
        {error ? (
          <p role="alert" className="m-0 text-sm text-error">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel isDisabled={isPending}>Cancel</AlertDialogCancel>
          <Button type="submit" isDisabled={!canSubmit || isPending}>
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </form>
    </AlertDialog>
  );
}
