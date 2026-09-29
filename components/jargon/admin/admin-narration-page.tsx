"use client";

import { useState, useTransition } from "react";
import {
  removeFromNarrationAllowlist,
  setNarrationEnabled,
} from "@/app/(private)/admin/narration/actions";
import { AllowlistManager } from "@/components/jargon/admin/admin-narration-allowlist-manager";
import { AdminNarrationSync } from "@/components/jargon/admin/admin-narration-sync";
import { AdminNarrationCaps } from "@/components/jargon/admin/admin-narration-caps";
import type { NarrationSettings } from "@/lib/jargon/admin/narration-settings";
import type { AdminNarrationAllowlistRow } from "@/lib/jargon/admin/list-narration-allowlist";
import type {
  CollectionNarrationCoverage,
  NarrationSyncJobView,
} from "@/lib/narration/sync-shared";

type AdminNarrationPageClientProps = {
  healthNote: string | null;
  cronNote: { text: string; warning: boolean } | null;
  caps: NarrationSettings["caps"];
  usageLast24h: NarrationSettings["usageLast24h"];
  enabled: boolean;
  allowlist: AdminNarrationAllowlistRow[];
  coverage: CollectionNarrationCoverage[];
  lastJob: NarrationSyncJobView | null;
};

export function AdminNarrationPageClient({
  healthNote,
  cronNote,
  caps,
  usageLast24h,
  enabled: initialEnabled,
  allowlist: initialAllowlist,
  coverage,
  lastJob,
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
      const result = await setNarrationEnabled(value);
      if (!result.ok) {
        setEnabled(previous);
        setToggleError(result.error);
      }
    });
  }

  function handleRemove(userId: string) {
    setRemoveError(null);
    const previous = allowlist;
    setRemovingId(userId);

    startTransition(async () => {
      const result = await removeFromNarrationAllowlist(userId);
      if (!result.ok) {
        setAllowlist(previous);
        setRemovingId(null);
        setRemoveError(result.error);
        return;
      }
      setTimeout(() => {
        setAllowlist((rows) => rows.filter((row) => row.userId !== userId));
        setRemovingId(null);
      }, 150);
    });
  }

  function handleAdded(row: AdminNarrationAllowlistRow) {
    setAllowlist((rows) => [row, ...rows.filter((existing) => existing.userId !== row.userId)]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="max-md:sr-only">
        <h1 className="text-2xl font-semibold text-base-content">Narration</h1>
        <p className="mt-1 text-base text-base-content/65">
          Control ElevenLabs narration for terms and stories, and who can use it. Narration is never
          charged in AI credits.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-base-300 px-4 py-3">
        <div>
          <p className="m-0 font-medium text-base-content">Narration enabled</p>
          <p className="m-0 text-sm text-base-content/65">
            When off, no one can play narration regardless of the allowlist below.
          </p>
          {healthNote ? <p className="mt-1 text-sm text-warning">{healthNote}</p> : null}
          {cronNote ? (
            <p
              className={`mt-1 text-sm ${cronNote.warning ? "text-warning" : "text-base-content/65"}`}
            >
              {cronNote.text}
            </p>
          ) : null}
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

      <AdminNarrationCaps caps={caps} usageLast24h={usageLast24h} />

      <AllowlistManager
        allowlist={allowlist}
        removingId={removingId}
        removeError={removeError}
        onAdded={handleAdded}
        onRemove={handleRemove}
      />

      <AdminNarrationSync enabled={enabled} coverage={coverage} lastJob={lastJob} />
    </div>
  );
}
