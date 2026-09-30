"use client";

import { useState, type FormEvent } from "react";
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

type ReasonConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  /** When set, the admin has to type this before they can confirm. */
  confirmText?: string;
  onSubmit: (values: { reason: string; typed: string }) => Promise<ActionResult<unknown>>;
  onSuccess?: () => void;
  onClose: () => void;
};

/** Asks for a reason (and optionally a typed confirmation) before a destructive action.
 *  Mount it only while it is open, so every opening starts empty. It stays open and shows
 *  the error when the action fails. */
export function ReasonConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmText,
  onSubmit,
  onSuccess,
  onClose,
}: ReasonConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const { run, isPending, error } = useAdminAction();

  const typedMatches =
    confirmText === undefined || typed.trim().toLowerCase() === confirmText.toLowerCase();
  const canConfirm = reason.trim().length > 0 && typedMatches && !isPending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canConfirm) return;
    const ok = await run(() => onSubmit({ reason: reason.trim(), typed: typed.trim() }));
    if (!ok) return;
    onClose();
    onSuccess?.();
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
        <label className="flex flex-col gap-1">
          <span className="text-sm">Reason (kept in the audit log)</span>
          <input
            type="text"
            maxLength={200}
            className="input input-bordered w-full"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            autoFocus
          />
        </label>
        {confirmText !== undefined ? (
          <label className="flex flex-col gap-1">
            <span className="text-sm">
              Type <strong>{confirmText}</strong> to confirm
            </span>
            <input
              type="text"
              className="input input-bordered w-full"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        ) : null}
        {error ? (
          <p role="alert" className="m-0 text-sm text-error">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel isDisabled={isPending}>Cancel</AlertDialogCancel>
          <Button type="submit" variant="destructive" isDisabled={!canConfirm}>
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </form>
    </AlertDialog>
  );
}
