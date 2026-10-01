"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DestinationMatch, DuplicatePolicy } from "@/lib/jargon/import/check-state";
import type { DraftTerm } from "@/lib/jargon/import/parse/types";

type CheckCardProps = {
  draft: DraftTerm;
  match: DestinationMatch | undefined;
  policy: DuplicatePolicy;
  onEdit: () => void;
  onRemove: () => void;
  onPolicyChange: (policy: DuplicatePolicy | null) => void;
};

export function CheckCard({
  draft,
  match,
  policy,
  onEdit,
  onRemove,
  onPolicyChange,
}: CheckCardProps) {
  const updating = match && policy === "update";

  return (
    <li className="shadow-surface content-visibility-auto rounded-xl bg-base-100 [contain-intrinsic-size:auto_5rem]">
      <div className="flex items-start gap-1 p-1">
        <button
          type="button"
          className="min-h-11 min-w-0 flex-1 rounded-lg p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Edit "${draft.term}"`}
          onClick={onEdit}
        >
          <span className="block truncate font-semibold">{draft.term}</span>
          {updating ? (
            <span className="mt-1 grid gap-1 text-sm">
              <span className="text-base-content/60">
                <span className="font-medium">Now: </span>
                {match.definition ?? "No definition yet"}
              </span>
              <span>
                <span className="font-medium">New: </span>
                {draft.definition ?? "No definition. The current one stays."}
              </span>
            </span>
          ) : draft.definition ? (
            <span className="line-clamp-3 block text-sm text-base-content/70">
              {draft.definition}
            </span>
          ) : (
            <span className="mt-0.5 block text-xs font-medium text-warning-content/80">
              No definition yet · Add one
            </span>
          )}
          {match ? (
            <span className="mt-1 block text-xs text-base-content/60">
              Already in this collection
            </span>
          ) : null}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-11 shrink-0 md:size-8"
          aria-label={`Remove "${draft.term}"`}
          onPress={onRemove}
        >
          <X className="size-4" aria-hidden strokeWidth={1.5} />
        </Button>
      </div>
      {match ? (
        <div className="px-3 pb-3">
          <ToggleGroup
            aria-label={`What to do with "${draft.term}"`}
            selectionMode="single"
            disallowEmptySelection
            variant="outline"
            size="sm"
            selectedKeys={[policy]}
            onSelectionChange={(keys) => {
              const [key] = [...keys];
              if (key === "skip" || key === "update") onPolicyChange(key);
            }}
          >
            <ToggleGroupItem id="skip" className="min-h-11 md:min-h-8">
              Skip
            </ToggleGroupItem>
            <ToggleGroupItem id="update" className="min-h-11 md:min-h-8">
              Update
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      ) : null}
    </li>
  );
}
