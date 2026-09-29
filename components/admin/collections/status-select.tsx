"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setCollectionStatus } from "@/app/(private)/admin/collections/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { settleAdminAction } from "@/lib/admin/settle-action";
import {
  needsOfflineConfirm,
  statusOf,
  type CollectionStatus,
} from "@/lib/jargon/admin/collection-status";
import type { AdminCollectionRow } from "@/lib/jargon/admin/list-all-collections";

const OPTIONS: { value: CollectionStatus; label: string }[] = [
  { value: "none", label: "Not built-in" },
  { value: "builtin", label: "Built-in" },
  { value: "published", label: "Published" },
];

/** Follows the server's status: shows a change at once, and falls back if saving fails. */
export function StatusSelect({ collection }: { collection: AdminCollectionRow }) {
  const status = statusOf(collection);
  const [shown, setShown] = useOptimistic(status);
  const [asking, setAsking] = useState<CollectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function change(target: CollectionStatus) {
    setError(null);
    startTransition(async () => {
      setShown(target);
      const result = await settleAdminAction(() => setCollectionStatus(collection.id, target));
      if (!result.ok) setError(result.error);
      else toast(`${collection.name} is now ${OPTIONS.find((o) => o.value === target)?.label}.`);
    });
  }

  function handleChange(target: CollectionStatus) {
    if (isPending || target === status) return;
    if (needsOfflineConfirm(status, target)) setAsking(target);
    else change(target);
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        className="select select-sm w-36"
        aria-label={`Status of ${collection.name}`}
        aria-disabled={isPending || undefined}
        value={shown}
        onChange={(event) => handleChange(event.target.value as CollectionStatus)}
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="m-0 text-sm text-error">
          {error}
        </p>
      ) : null}
      {asking ? (
        <ConfirmDialog
          isOpen
          onOpenChange={(open) => !open && setAsking(null)}
          title="Take this collection offline?"
          description={`The public page for ${collection.name} goes offline.`}
          confirmLabel="Take offline"
          onConfirm={() => change(asking)}
        />
      ) : null}
    </div>
  );
}
