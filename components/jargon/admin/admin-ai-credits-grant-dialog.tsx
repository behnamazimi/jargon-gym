"use client";

import { useState, type FormEvent } from "react";
import { grantAiCredits } from "@/app/(private)/admin/ai-credits/actions";
import { useAdminAction } from "@/hooks/use-admin-action";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function GrantForm({ initialEmail, onClose }: { initialEmail: string; onClose: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState("");
  const { run, isPending, error } = useAdminAction();

  function handleGrant(event: FormEvent) {
    event.preventDefault();
    void run(() => grantAiCredits({ email, amount: Number(amount), note }), {
      onSuccess: onClose,
      successMessage: "Credits granted.",
    });
  }

  return (
    <form onSubmit={handleGrant} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Grant credits</DialogTitle>
        <DialogDescription>
          Adds to their starter credits. Resetting usage later keeps the grant.
        </DialogDescription>
      </DialogHeader>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-base-content">Email</span>
        <input
          type="email"
          className="input input-bordered min-h-11 w-full"
          placeholder="user@example.com"
          value={email}
          disabled={isPending}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-base-content">Credits</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={10000}
          className="input input-bordered min-h-11 w-full"
          value={amount}
          disabled={isPending}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-base-content">Note (optional)</span>
        <input
          type="text"
          maxLength={200}
          className="input input-bordered min-h-11 w-full"
          placeholder="Why, for your own records"
          value={note}
          disabled={isPending}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {error ? (
        <p role="alert" className="m-0 text-sm text-error">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <button type="button" className="btn btn-ghost min-h-11" onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary min-h-11"
          disabled={isPending || !email.trim() || !amount}
        >
          {isPending ? "Granting…" : "Grant credits"}
        </button>
      </DialogFooter>
    </form>
  );
}

/** `email` is null while closed; a string (possibly empty) opens it prefilled. */
export function AdminAiCreditsGrantDialog({
  email,
  onOpenChange,
}: {
  email: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog isOpen={email !== null} onOpenChange={onOpenChange} className="max-w-sm">
      <GrantForm initialEmail={email ?? ""} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}
