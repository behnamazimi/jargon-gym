"use client";

import { useState, useTransition } from "react";
import {
  addToNarrationAllowlist,
  removeFromNarrationAllowlist,
  setNarrationEnabled,
} from "@/app/(private)/admin/narration/actions";
import { AdminNav } from "@/components/jargon/admin/admin-nav";
import type { AdminNarrationAllowlistRow } from "@/lib/jargon/admin/list-narration-allowlist";
import { cn } from "@/lib/utils";

type AdminNarrationPageClientProps = {
  enabled: boolean;
  allowlist: AdminNarrationAllowlistRow[];
};

export function AdminNarrationPageClient({
  enabled: initialEnabled,
  allowlist: initialAllowlist,
}: AdminNarrationPageClientProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [allowlist, setAllowlist] = useState(initialAllowlist);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(value: boolean) {
    setToggleError(null);
    const previous = enabled;
    setEnabled(value);

    startTransition(async () => {
      try {
        await setNarrationEnabled(value);
      } catch (err) {
        setEnabled(previous);
        setToggleError(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  function handleRemove(userId: string) {
    const previous = allowlist;
    setRemovingId(userId);

    startTransition(async () => {
      try {
        await removeFromNarrationAllowlist(userId);
        setTimeout(() => {
          setAllowlist((rows) => rows.filter((row) => row.userId !== userId));
          setRemovingId(null);
        }, 150);
      } catch {
        setAllowlist(previous);
        setRemovingId(null);
      }
    });
  }

  function handleAdded(row: AdminNarrationAllowlistRow) {
    setAllowlist((rows) => [row, ...rows.filter((existing) => existing.userId !== row.userId)]);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <div className="max-md:sr-only">
        <h1 className="text-2xl font-semibold text-base-content">Narration</h1>
        <p className="mt-1 text-base text-base-content/65">
          Control the ElevenLabs term narration feature and who can use it.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-base-300 px-4 py-3">
        <div>
          <p className="m-0 font-medium text-base-content">Narration enabled</p>
          <p className="m-0 text-sm text-base-content/65">
            When off, no one can play narration regardless of the allowlist below.
          </p>
          {toggleError ? <p className="mt-1 text-sm text-error">{toggleError}</p> : null}
        </div>
        <input
          type="checkbox"
          className="toggle toggle-primary"
          checked={enabled}
          disabled={isPending}
          onChange={(event) => handleToggle(event.target.checked)}
          aria-label="Enable narration"
        />
      </div>

      <AllowlistManager
        allowlist={allowlist}
        removingId={removingId}
        onAdded={handleAdded}
        onRemove={handleRemove}
      />
    </div>
  );
}

function AllowlistManager({
  allowlist,
  removingId,
  onAdded,
  onRemove,
}: {
  allowlist: AdminNarrationAllowlistRow[];
  removingId: string | null;
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
