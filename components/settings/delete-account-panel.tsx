"use client";

import { useState, useTransition, type FormEvent } from "react";
import { deleteOwnAccountAction } from "@/app/(private)/app/settings/actions";
import { DangerZone } from "@/components/settings/ui";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

function DeleteAccountDialog({ email, onClose }: { email: string; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canConfirm = typed.trim().toLowerCase() === email.toLowerCase() && !isPending;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canConfirm) return;
    startTransition(async () => {
      const result = await deleteOwnAccountAction(typed.trim());
      if (result.error) setError(result.error);
    });
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
        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
        <AlertDialogDescription>
          Your terms, collections, study history and settings are deleted for good. This can&apos;t
          be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm">
            Type <strong>{email}</strong> to confirm
          </span>
          <input
            type="email"
            className="input input-bordered w-full"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </label>
        {error ? (
          <p role="alert" className="m-0 text-sm text-error">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel isDisabled={isPending}>Cancel</AlertDialogCancel>
          <Button type="submit" variant="destructive" isDisabled={!canConfirm}>
            {isPending ? "Deleting…" : "Delete account"}
          </Button>
        </AlertDialogFooter>
      </form>
    </AlertDialog>
  );
}

export function DeleteAccountPanel({ email }: { email: string }) {
  const [isAsking, setIsAsking] = useState(false);

  return (
    <DangerZone
      title="Delete account"
      description="Permanently remove your account and everything in it."
    >
      <Button variant="destructive" onPress={() => setIsAsking(true)}>
        Delete account…
      </Button>
      {isAsking ? <DeleteAccountDialog email={email} onClose={() => setIsAsking(false)} /> : null}
    </DangerZone>
  );
}
