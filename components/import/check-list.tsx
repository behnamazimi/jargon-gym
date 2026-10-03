"use client";

import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CheckCard } from "@/components/import/check-card";
import type { CardFilter, ImportFlowState } from "@/components/import/use-import-flow";
import { activeDrafts, effectivePolicy, matchFor } from "@/lib/import/check-state";
import { pluralize } from "@/lib/utils";

function summaryLine(flow: ImportFlowState) {
  const { toAdd, toFinish, updated, alreadyThere } = flow.summary;
  return [
    `${pluralize(toAdd - toFinish - updated, "term")} ready`,
    toFinish > 0 ? `${toFinish} without a definition` : null,
    alreadyThere > 0 ? `${alreadyThere} already in this collection` : null,
    flow.checking ? "Checking…" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function RemovedNotice({ flow }: { flow: ImportFlowState }) {
  const removed = flow.check.drafts.find(
    (draft) => draft.id === flow.lastRemoved && flow.check.removedIds.includes(draft.id),
  );
  if (!removed) return null;

  return (
    <Alert>
      <AlertDescription>Removed &ldquo;{removed.term}&rdquo;</AlertDescription>
      <AlertAction>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onPress={() => flow.restoreCard(removed.id)}
        >
          Restore
        </Button>
      </AlertAction>
    </Alert>
  );
}

/** The summary, the filter chips and one card per term. When nothing needs a
 *  look, only a compact "ready" line shows. */
export function CheckList({
  flow,
  onEdit,
}: {
  flow: ImportFlowState;
  onEdit: (id: string) => void;
}) {
  const drafts = activeDrafts(flow.check);
  const { toFinish, alreadyThere, toAdd } = flow.summary;
  const quiet = toFinish === 0 && alreadyThere === 0 && (flow.built?.conflicts.length ?? 0) === 0;

  if (!flow.reviewAll && quiet && drafts.length > 0) {
    return (
      <div className="shadow-surface flex items-center justify-between gap-3 rounded-field bg-base-100 p-3">
        <p className="m-0 font-medium" role="status">
          {pluralize(toAdd, "term")} ready
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11"
          onPress={() => flow.setReviewAll(true)}
        >
          Review all
        </Button>
      </div>
    );
  }

  const visible = drafts.filter((draft) => {
    if (flow.filter === "attention") return !draft.definition;
    if (flow.filter === "there") return Boolean(matchFor(flow.check, draft));
    return true;
  });

  return (
    <>
      <div className="space-y-2">
        <p className="m-0 text-sm font-medium" role="status">
          {summaryLine(flow)}
        </p>
        <ToggleGroup
          aria-label="Show"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[flow.filter]}
          onSelectionChange={(keys) => {
            const [key] = [...keys];
            if (key) flow.setFilter(String(key) as CardFilter);
          }}
        >
          <ToggleGroupItem id="all">All</ToggleGroupItem>
          <ToggleGroupItem id="attention">Needs a look</ToggleGroupItem>
          <ToggleGroupItem id="there">Already there</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <RemovedNotice flow={flow} />

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {visible.map((draft) => (
          <CheckCard
            key={draft.id}
            draft={draft}
            match={matchFor(flow.check, draft)}
            policy={effectivePolicy(flow.check, draft)}
            onEdit={() => onEdit(draft.id)}
            onRemove={() => flow.removeCard(draft.id)}
            onPolicyChange={(policy) => flow.setOverride(draft.id, policy)}
          />
        ))}
      </ul>
    </>
  );
}
