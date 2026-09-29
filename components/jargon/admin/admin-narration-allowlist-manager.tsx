"use client";

import { useState } from "react";
import {
  addToNarrationAllowlist,
  removeFromNarrationAllowlist,
} from "@/app/(private)/admin/ai/narration/actions";
import { AdminSection } from "@/components/admin/admin-section";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminAction } from "@/hooks/use-admin-action";
import { formatAdminDate } from "@/lib/admin/format";
import type { AdminNarrationAllowlistRow } from "@/lib/jargon/admin/list-narration-allowlist";

export function AllowlistManager({ allowlist }: { allowlist: AdminNarrationAllowlistRow[] }) {
  const [email, setEmail] = useState("");
  const [removing, setRemoving] = useState<AdminNarrationAllowlistRow | null>(null);
  const { run, isPending, error, clearError } = useAdminAction();

  function handleAdd() {
    const trimmed = email.trim();
    if (!trimmed) return;
    void run(() => addToNarrationAllowlist(trimmed), {
      onSuccess: () => setEmail(""),
      successMessage: "Added.",
    });
  }

  function handleRemove() {
    if (!removing) return;
    const { userId } = removing;
    void run(() => removeFromNarrationAllowlist(userId), { successMessage: "Removed." });
  }

  return (
    <AdminSection
      id="narration-access"
      title="Who can use narration"
      description="People on this list can play narration while it is switched on."
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          className="input input-bordered flex-1"
          placeholder="user@example.com"
          aria-label="Email to add"
          value={email}
          readOnly={isPending}
          onChange={(event) => {
            clearError();
            setEmail(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAdd();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-primary transition-transform active:scale-[0.96]"
          disabled={isPending}
          onClick={handleAdd}
        >
          {isPending ? "Working…" : "Add"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="m-0 text-sm text-error">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Added</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {allowlist.map((row) => (
              <tr key={row.userId}>
                <td className="font-medium text-base-content">{row.email}</td>
                <td className="text-base-content/65">{formatAdminDate(row.createdAt)}</td>
                <td className="text-right">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost transition-transform active:scale-[0.96]"
                    disabled={isPending}
                    onClick={() => setRemoving(row)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {allowlist.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-base-content/50">
                  No one has access yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove access?"
        description={`${removing?.email ?? "This person"} can no longer play narration.`}
        confirmLabel="Remove"
        onConfirm={handleRemove}
      />
    </AdminSection>
  );
}
