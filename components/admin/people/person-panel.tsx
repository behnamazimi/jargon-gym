"use client";

import { useState, type FormEvent } from "react";
import { grantAiCredits, resetAiCredits } from "@/app/(private)/admin/ai/credits/actions";
import {
  addToNarrationAllowlist,
  removeFromNarrationAllowlist,
} from "@/app/(private)/admin/ai/narration/actions";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminAction } from "@/hooks/use-admin-action";
import { formatAdminDate } from "@/lib/admin/format";
import type { AdminPerson } from "@/lib/admin/people/person";

function GrantForm({ person }: { person: AdminPerson }) {
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState("");
  const { run, isPending, error } = useAdminAction();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void run(() => grantAiCredits({ email: person.email, amount: Number(amount), note }), {
      onSuccess: () => setNote(""),
      successMessage: "Credits granted.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm">Credits</span>
        <input
          type="number"
          min={1}
          max={10000}
          className="input input-bordered w-28"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <label className="flex min-w-40 flex-1 flex-col gap-1">
        <span className="text-sm">Note (optional)</span>
        <input
          type="text"
          maxLength={200}
          className="input input-bordered w-full"
          placeholder="Why, for your own records"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-outline" disabled={isPending || !amount}>
        {isPending ? "Granting…" : "Grant credits"}
      </button>
      {error ? (
        <p role="alert" className="m-0 w-full text-sm text-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function PersonPanel({ person, isYou }: { person: AdminPerson; isYou: boolean }) {
  const [resetting, setResetting] = useState(false);
  const { run, isPending, error } = useAdminAction();

  return (
    <AdminSection id="person" title={person.email}>
      <div className="flex flex-col gap-4 rounded-lg border border-base-300 px-4 py-4">
        <p className="m-0 text-sm text-base-content/65">
          <span className={`badge mr-2 ${person.role === "admin" ? "badge-primary" : ""}`}>
            {person.role}
          </span>
          Joined {formatAdminDate(person.createdAt)}
          {isYou ? " · This is you." : null}
        </p>

        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-sm font-semibold">AI credits</h3>
          <p className="m-0 text-sm text-base-content/65">
            {person.credits
              ? `${person.credits.remaining} of ${person.credits.total} left. `
              : "Couldn't read their balance. "}
            Grants add to it; a reset gives back the full allowance.
          </p>
          <GrantForm person={person} />
          <div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={isPending}
              onClick={() => setResetting(true)}
            >
              Reset usage
            </button>
          </div>
          {error ? (
            <p role="alert" className="m-0 text-sm text-error">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-sm font-semibold">Narration</h3>
          <div className="flex items-center gap-3">
            <AdminSwitch
              label={`Narration for ${person.email}`}
              value={person.narration === "on"}
              save={(next) =>
                next
                  ? addToNarrationAllowlist(person.email)
                  : removeFromNarrationAllowlist(person.id)
              }
            />
            <span className="text-sm text-base-content/65">
              {person.narration === "partly"
                ? "Partly on (only one of terms and stories). Turning it on allows both."
                : person.narration === "on"
                  ? "Can play narration when it is switched on."
                  : "Can't play narration."}
            </span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={resetting}
        onOpenChange={setResetting}
        title="Reset usage?"
        description={`${person.email} gets their full allowance back, from now on. Their history stays on record, and credits you granted are kept.`}
        confirmLabel="Reset usage"
        onConfirm={() =>
          void run(() => resetAiCredits(person.id), { successMessage: "Usage reset." })
        }
      />
    </AdminSection>
  );
}
