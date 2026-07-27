"use client";

import { Plus, Trash2 } from "lucide-react";
import type { RelationshipDraft } from "@/lib/jargon/relationship-schema";
import type { Term } from "@/lib/jargon/types";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TermRelationshipsEditorProps = {
  drafts: RelationshipDraft[];
  onChange: (drafts: RelationshipDraft[]) => void;
  domainTerms: Term[];
  sourceTermId?: string;
};

function createDraftKey() {
  return `draft-${crypto.randomUUID()}`;
}

export function TermRelationshipsEditor({
  drafts,
  onChange,
  domainTerms,
  sourceTermId,
}: TermRelationshipsEditorProps) {
  const targetOptions = domainTerms.filter((term) => term.id !== sourceTermId);

  function updateDraft(key: string, patch: Partial<RelationshipDraft>) {
    onChange(drafts.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)));
  }

  function removeDraft(key: string) {
    onChange(drafts.filter((draft) => draft.key !== key));
  }

  function addOutgoingDraft() {
    const firstTarget = targetOptions[0];
    onChange([
      ...drafts,
      {
        key: createDraftKey(),
        direction: "outgoing",
        relatedTermId: firstTarget?.id ?? "",
        relatedTermName: firstTarget?.term ?? "",
        relationshipType: "",
        description: "",
      },
    ]);
  }

  return (
    <div className="space-y-3 border-t border-base-300 pt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Relationships</h3>
          <p className="text-xs text-base-content/60">
            Link this term to others in the collection.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onPress={addOutgoingDraft}
          isDisabled={targetOptions.length === 0}
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {targetOptions.length === 0 ? (
        <p className="text-xs text-base-content/60">
          Add another term first, then you can link them.
        </p>
      ) : null}

      {drafts.length === 0 ? (
        <p className="text-xs text-base-content/60">No relationships yet.</p>
      ) : (
        <ul className="space-y-3">
          {drafts.map((draft) => (
            <li
              key={draft.key}
              className="space-y-2 rounded-lg border border-base-300/70 bg-base-200/20 p-3"
            >
              {draft.direction === "incoming" ? (
                <p className="text-sm text-base-content/60">
                  <span className="font-medium text-base-content">{draft.relatedTermName}</span>{" "}
                  <span className="italic">{draft.relationshipType}</span> this term
                </p>
              ) : (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${draft.key}-target`}>Related term</FieldLabel>
                    <Select
                      selectedKey={draft.relatedTermId || undefined}
                      onSelectionChange={(key) => {
                        const term = targetOptions.find((item) => item.id === key);
                        if (!term) return;
                        updateDraft(draft.key, {
                          relatedTermId: term.id,
                          relatedTermName: term.term,
                        });
                      }}
                      aria-label="Related term"
                    >
                      <SelectTrigger id={`${draft.key}-target`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {targetOptions.map((term) => (
                          <SelectItem key={term.id} id={term.id}>
                            {term.term}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor={`${draft.key}-type`}>Relationship type</FieldLabel>
                    <Input
                      id={`${draft.key}-type`}
                      value={draft.relationshipType}
                      onChange={(event) =>
                        updateDraft(draft.key, { relationshipType: event.target.value })
                      }
                      placeholder="e.g. often confused with"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor={`${draft.key}-description`}>
                      Description (optional)
                    </FieldLabel>
                    <Textarea
                      id={`${draft.key}-description`}
                      value={draft.description}
                      onChange={(event) =>
                        updateDraft(draft.key, { description: event.target.value })
                      }
                      className="min-h-16"
                    />
                  </Field>
                </>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onPress={() => removeDraft(draft.key)}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
