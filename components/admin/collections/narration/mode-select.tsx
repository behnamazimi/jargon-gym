"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setNarrationMode } from "@/app/(private)/admin/collections/narration-mode-actions";
import { useToast } from "@/components/ui/toast";
import { settleAdminAction } from "@/lib/admin/settle-action";
import { NARRATION_MODES, narrationModeLabel, type NarrationMode } from "@/lib/narration/mode";

/** Shows a change at once, and falls back if saving fails. */
export function NarrationModeSelect({
  collectionId,
  name,
  mode,
}: {
  collectionId: string;
  name: string;
  mode: NarrationMode;
}) {
  const [shown, setShown] = useOptimistic(mode);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleChange(target: NarrationMode) {
    if (isPending || target === mode) return;
    setError(null);
    startTransition(async () => {
      setShown(target);
      const result = await settleAdminAction(() => setNarrationMode(collectionId, target));
      if (!result.ok) setError(result.error);
      else toast(`${name} now narrates ${narrationModeLabel(target).toLowerCase()}.`);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-base-content">Narration mode</span>
        <select
          className="select w-full sm:w-72"
          aria-disabled={isPending || undefined}
          value={shown}
          onChange={(event) => handleChange(event.target.value as NarrationMode)}
        >
          {NARRATION_MODES.map((option) => (
            <option key={option} value={option}>
              {narrationModeLabel(option)}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p role="alert" className="m-0 text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
