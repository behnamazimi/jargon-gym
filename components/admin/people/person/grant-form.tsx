"use client";

import { useState, type FormEvent } from "react";
import { grantAiCredits } from "@/app/(private)/admin/ai/credits/actions";
import { useAdminAction } from "@/hooks/use-admin-action";
import type { AdminPerson } from "@/lib/admin/people/person";

export function GrantForm({ person }: { person: Pick<AdminPerson, "email"> }) {
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
