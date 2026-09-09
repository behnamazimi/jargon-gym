"use client";

import { useState, useTransition } from "react";
import {
  removeFromNarrationAllowlist,
  setNarrationEnabled,
} from "@/app/(private)/admin/narration/actions";
import { AdminNav } from "@/components/jargon/admin/admin-nav";
import { AllowlistManager } from "@/components/jargon/admin/admin-narration-allowlist-manager";
import type { AdminNarrationAllowlistRow } from "@/lib/jargon/admin/list-narration-allowlist";

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
  const [removeError, setRemoveError] = useState<string | null>(null);
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
    setRemoveError(null);
    const previous = allowlist;
    setRemovingId(userId);

    startTransition(async () => {
      try {
        await removeFromNarrationAllowlist(userId);
        setTimeout(() => {
          setAllowlist((rows) => rows.filter((row) => row.userId !== userId));
          setRemovingId(null);
        }, 150);
      } catch (err) {
        setAllowlist(previous);
        setRemovingId(null);
        setRemoveError(err instanceof Error ? err.message : "Failed to remove.");
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
        removeError={removeError}
        onAdded={handleAdded}
        onRemove={handleRemove}
      />
    </div>
  );
}
