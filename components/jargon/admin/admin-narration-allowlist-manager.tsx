"use client";

import { useState, useTransition } from "react";
import { addToNarrationAllowlist } from "@/app/(private)/admin/narration/actions";
import type { AdminNarrationAllowlistRow } from "@/lib/jargon/admin/list-narration-allowlist";
import { cn } from "@/lib/utils";

export function AllowlistManager({
  allowlist,
  removingId,
  removeError,
  onAdded,
  onRemove,
}: {
  allowlist: AdminNarrationAllowlistRow[];
  removingId: string | null;
  removeError: string | null;
  onAdded: (row: AdminNarrationAllowlistRow) => void;
  onRemove: (userId: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setError(null);

    startTransition(async () => {
      try {
        const added = await addToNarrationAllowlist(trimmed);
        onAdded({ userId: added.userId, email: added.email, createdAt: new Date().toISOString() });
        setEmail("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          className="input input-bordered flex-1"
          placeholder="user@example.com"
          value={email}
          disabled={isPending}
          onChange={(event) => setEmail(event.target.value)}
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
          {isPending ? "Adding…" : "Add"}
        </button>
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      {removeError ? <p className="text-sm text-error">{removeError}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {allowlist.map((row) => (
              <tr
                key={row.userId}
                className={cn(
                  "transition-[opacity,transform] duration-150 ease-out",
                  removingId === row.userId && "-translate-y-1 opacity-0",
                )}
              >
                <td className="font-medium text-base-content">{row.email}</td>
                <td className="text-base-content/65">
                  {new Date(row.createdAt).toLocaleDateString()}
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost transition-transform active:scale-[0.96]"
                    disabled={removingId === row.userId}
                    onClick={() => onRemove(row.userId)}
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
    </div>
  );
}
