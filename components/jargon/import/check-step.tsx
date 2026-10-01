"use client";

import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CheckList } from "@/components/jargon/import/check-list";
import { ConflictChooser, DuplicatePolicy, Notices } from "@/components/jargon/import/check-extras";
import { DestinationBlock } from "@/components/jargon/import/destination-block";
import { FixedDestinationNote, UnfinishedNote } from "@/components/jargon/import/fixed-destination";
import { EditTermDialog } from "@/components/jargon/import/edit-term-dialog";
import { ImportFailurePanel } from "@/components/jargon/import/import-errors";
import { ColumnRoles } from "@/components/jargon/import/column-roles";
import { SeparatorChips } from "@/components/jargon/import/separator-chips";
import type { ImportFlowState } from "@/components/jargon/import/use-import-flow";
import { activeDrafts } from "@/lib/jargon/import/check-state";
import { guessLanguage } from "@/lib/jargon/import/parse/dutch-hint";
import { pluralize } from "@/lib/utils";

function commitLabel(flow: ImportFlowState) {
  if (flow.adapter) return flow.adapter.commitLabel(flow.summary, flow.isCommitting);
  if (flow.isCommitting) return "Adding…";
  const { toAdd, toFinish } = flow.summary;
  if (toAdd === 0) return "Add terms";
  const base = `Add ${pluralize(toAdd, "term")}`;
  return toFinish > 0 ? `${base} · ${toFinish} to finish later` : base;
}

export function CheckStep({ flow, addedNames }: { flow: ImportFlowState; addedNames: string[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const drafts = activeDrafts(flow.check);
  const guessed = guessLanguage(drafts.flatMap((d) => [d.term, d.definition ?? ""]));
  const editingDraft = flow.check.drafts.find((d) => d.id === editing) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-11 md:size-8"
          aria-label="Back to your list"
          onPress={flow.backToPaste}
        >
          <ArrowLeft className="size-5" aria-hidden strokeWidth={1.5} />
        </Button>
        <h2 tabIndex={-1} className="m-0 text-lg font-semibold outline-none">
          Check {pluralize(drafts.length, "term")}
        </h2>
      </div>

      {flow.adapter ? (
        <FixedDestinationNote flow={flow} />
      ) : (
        <DestinationBlock
          collections={flow.collections}
          addedNames={addedNames}
          mode={flow.mode}
          newName={flow.newName}
          language={flow.language}
          existingId={flow.existingId}
          disabled={flow.isCommitting}
          guessedLanguage={guessed}
          fileLanguage={flow.json?.language ?? null}
          onModeChange={flow.setDestination}
          onNameChange={flow.setNewName}
          onLanguageChange={flow.setLanguage}
        />
      )}

      {flow.parsed ? (
        <SeparatorChips
          parsed={flow.parsed}
          options={flow.options}
          swap={flow.swap}
          onOptionsChange={flow.changeOptions}
          onSwap={flow.toggleSwap}
        />
      ) : null}

      {flow.parsed ? (
        <ColumnRoles
          parsed={flow.parsed}
          onRolesChange={(roles) => flow.changeOptions({ roles })}
        />
      ) : null}

      {flow.built?.swapHint && !flow.swap ? (
        <p className="m-0 text-sm text-base-content/60" role="status">
          The terms look like definitions. Try Swap term and definition.
        </p>
      ) : null}

      <Field>
        <FieldLabel htmlFor="import-category">Category for these terms (optional)</FieldLabel>
        <Input
          id="import-category"
          value={flow.check.category}
          className="text-base"
          placeholder="e.g. Finance"
          onChange={(event) => flow.setCategory(event.target.value)}
        />
      </Field>

      <UnfinishedNote flow={flow} />

      <Notices flow={flow} />
      <ConflictChooser flow={flow} />
      <DuplicatePolicy flow={flow} />
      <CheckList flow={flow} onEdit={setEditing} />

      {flow.failure ? <ImportFailurePanel failure={flow.failure} /> : null}

      <div className="space-y-2 pb-4">
        <Button
          type="button"
          className="min-h-12 w-full"
          isDisabled={!flow.canAdd || flow.isCommitting}
          onPress={flow.commit}
        >
          {commitLabel(flow)}
        </Button>
        {flow.summary.toAdd === 0 && drafts.length > 0 ? (
          <p className="m-0 text-center text-sm text-base-content/60" role="status">
            Every term is already in this collection.
          </p>
        ) : null}
      </div>

      <EditTermDialog
        draft={editingDraft}
        onClose={() => setEditing(null)}
        onSave={flow.editCard}
      />
    </div>
  );
}
