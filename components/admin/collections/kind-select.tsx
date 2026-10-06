"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setCollectionKind } from "@/app/(private)/admin/collections/actions";
import { useToast } from "@/components/ui/toast";
import { settleAdminAction } from "@/lib/admin/settle-action";
import type { AdminCollectionRow } from "@/lib/admin/collections/list-all-collections";
import { COLLECTION_KIND_OPTIONS, kindLabel, type CollectionKind } from "@/lib/terms/kinds";

/** Shows a change at once, and falls back if saving fails. */
export function KindSelect({ collection }: { collection: AdminCollectionRow }) {
  const [shown, setShown] = useOptimistic(collection.kind);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleChange(target: CollectionKind) {
    if (isPending || target === collection.kind) return;
    setError(null);
    startTransition(async () => {
      setShown(target);
      const result = await settleAdminAction(() => setCollectionKind(collection.id, target));
      if (!result.ok) setError(result.error);
      else toast(`${collection.name} is now marked as ${kindLabel(target).toLowerCase()}.`);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        className="select select-sm w-44"
        aria-label={`Kind of ${collection.name}`}
        aria-disabled={isPending || undefined}
        value={shown}
        onChange={(event) => handleChange(event.target.value as CollectionKind)}
      >
        {COLLECTION_KIND_OPTIONS.map((option) => (
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
    </div>
  );
}
