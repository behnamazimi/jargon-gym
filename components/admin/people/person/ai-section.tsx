"use client";

import { useState } from "react";
import { resetAiCredits } from "@/app/(private)/admin/ai/credits/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { GrantForm } from "@/components/admin/people/person/grant-form";
import { useAdminAction } from "@/hooks/use-admin-action";
import type { AdminPerson } from "@/lib/admin/people/person";

export function AiSection({ person }: { person: AdminPerson }) {
  const [resetting, setResetting] = useState(false);
  const { run, isPending, error } = useAdminAction();

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-base-300 px-4 py-4">
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
    </div>
  );
}
