"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { CategoryField, OptionalDetailFields } from "@/components/jargon/term-form-fields";
import { TermRelationshipsEditor } from "@/components/jargon/term-relationships-editor";
import { buildTermPayload, emptyDetails } from "@/components/jargon/term-form-dialog-helpers";
import { PastedListPrompt } from "@/components/jargon/pasted-list-prompt";
import { unfinishedSavedMessage } from "@/lib/jargon/capture/copy";
import { useTermActions } from "@/hooks/use-term-actions";
import { writeDraft } from "@/lib/jargon/import/draft-store";
import { classifyTermPaste } from "@/lib/jargon/import/term-paste";
import type { RelationshipDraft } from "@/lib/jargon/relationship-schema";
import { buildRelationshipSync, validateRelationshipDrafts } from "@/lib/jargon/relationship-sync";
import { findDuplicateTerm, mostUsedCategory } from "@/lib/jargon/term-duplicates";
import type { TermFormValues } from "@/lib/jargon/term-schema";
import type { Term, UnfinishedTerm } from "@/lib/jargon/types";
import { cn } from "@/lib/utils";

type AddTermDialogProps = {
  domainId: string;
  domainTerms: Term[];
  /** Saved without a definition. They still count as duplicates. */
  unfinishedTerms: UnfinishedTerm[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenTerm: (term: string) => void;
};

type AddTermFormProps = Omit<AddTermDialogProps, "isOpen">;

function AddTermForm({
  domainId,
  domainTerms,
  unfinishedTerms,
  onOpenChange,
  onOpenTerm,
}: AddTermFormProps) {
  const { createTerm, isBusy, error } = useTermActions();
  const { toast } = useToast();
  const termInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<TermFormValues>(() => ({
    term: "",
    definition: "",
    category: mostUsedCategory(domainTerms),
    ...emptyDetails,
  }));
  const [relationshipDrafts, setRelationshipDrafts] = useState<RelationshipDraft[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pastedLines, setPastedLines] = useState<string[] | null>(null);
  const router = useRouter();

  function handleTermPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = classifyTermPaste(event.clipboardData.getData("text/plain"));
    if (pasted.kind === "single") return;
    event.preventDefault();
    if (pasted.kind === "term-and-definition") {
      setForm((prev) => ({ ...prev, term: pasted.term, definition: pasted.definition }));
      return;
    }
    setPastedLines(pasted.lines);
  }

  function addPastedAsList(lines: string[]) {
    writeDraft(lines.join("\n"));
    onOpenChange(false);
    router.push(`/jargon/import/paste?to=${domainId}&from=term`);
  }

  const duplicate = findDuplicateTerm(form.term, [...domainTerms, ...unfinishedTerms]);
  const canSave = form.term.trim().length > 0 && !duplicate;
  const displayError = validationError ?? error;

  function updateField<K extends keyof TermFormValues>(key: K, value: TermFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(addAnother: boolean) {
    if (!canSave || isBusy) return;
    setValidationError(null);

    const relationshipValidation = validateRelationshipDrafts(relationshipDrafts, undefined);
    if (relationshipValidation) {
      setDetailsOpen(true);
      setValidationError(relationshipValidation);
      return;
    }

    const payload = buildTermPayload({
      ...form,
      category: form.category.trim() || mostUsedCategory(domainTerms),
    });
    const relationshipSync = buildRelationshipSync([], relationshipDrafts);

    // Focus before the request so the phone keyboard stays up between saves.
    if (addAnother) termInputRef.current?.focus();

    const saved = await createTerm(domainId, payload, { create: relationshipSync.create });
    if (!saved) return;

    const name = payload.term.trim();
    const unfinished = !form.definition.trim();

    if (!addAnother) {
      if (unfinished) toast(unfinishedSavedMessage(name), "success");
      onOpenChange(false);
      return;
    }

    toast(unfinished ? unfinishedSavedMessage(name) : `Added "${name}"`, "success");
    setForm({ term: "", definition: "", category: payload.category, ...emptyDetails });
    setRelationshipDrafts([]);
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
      className="flex min-h-0 flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>Add a term</DialogTitle>
        <DialogDescription>Add a term to this collection.</DialogDescription>
      </DialogHeader>

      <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
        <Field>
          <FieldLabel htmlFor="term-name">Term</FieldLabel>
          <Input
            id="term-name"
            ref={termInputRef}
            value={form.term}
            autoFocus
            className="text-base"
            placeholder="e.g. Idempotent"
            onChange={(event) => updateField("term", event.target.value)}
            onPaste={handleTermPaste}
          />
        </Field>

        {pastedLines ? (
          <PastedListPrompt
            lines={pastedLines}
            onAddAsList={() => addPastedAsList(pastedLines)}
            onKeepAsOne={() => {
              updateField("term", pastedLines.join(" "));
              setPastedLines(null);
            }}
          />
        ) : null}

        {duplicate ? (
          <Alert>
            <AlertDescription>
              <p className="m-0">&ldquo;{duplicate.term}&rdquo; is already in this collection.</p>
              <p className="m-0 text-base-content/60">
                Different meaning? Add a qualifier, like &ldquo;SLA (legal)&rdquo;.
              </p>
            </AlertDescription>
            <AlertAction>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onPress={() => {
                  onOpenTerm(duplicate.term);
                  onOpenChange(false);
                }}
              >
                Open it
              </Button>
            </AlertAction>
          </Alert>
        ) : null}

        <Field>
          <FieldLabel htmlFor="term-definition">Definition</FieldLabel>
          <Textarea
            id="term-definition"
            value={form.definition}
            className="min-h-20 text-base"
            placeholder="What does it mean?"
            onChange={(event) => updateField("definition", event.target.value)}
          />
          <p className="m-0 mt-1 text-xs text-base-content/60">Leave it empty to finish later.</p>
        </Field>

        <Collapsible isExpanded={detailsOpen} onExpandedChange={setDetailsOpen}>
          <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm">
            <span>
              <span className="font-medium">More details</span>
              <span className="block text-xs text-base-content/60">
                Category, example, notes and links to other terms
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-base-content/60 transition-transform motion-reduce:transition-none",
                detailsOpen && "rotate-180",
              )}
              aria-hidden
              strokeWidth={1.5}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 pt-2">
              <CategoryField form={form} onFieldChange={updateField} />
              <OptionalDetailFields form={form} onFieldChange={updateField} />
              {domainTerms.length > 0 ? (
                <TermRelationshipsEditor
                  drafts={relationshipDrafts}
                  onChange={setRelationshipDrafts}
                  domainTerms={domainTerms}
                  sourceTermId={undefined}
                />
              ) : null}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {displayError ? (
        <Alert variant="destructive">
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter className="shrink-0">
        <Button type="button" variant="outline" onPress={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          isDisabled={!canSave || isBusy}
          onPress={() => void save(true)}
        >
          Save and add another
        </Button>
        <Button type="submit" isDisabled={!canSave || isBusy}>
          {isBusy ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddTermDialog({ isOpen, ...formProps }: AddTermDialogProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={formProps.onOpenChange}>
      <AddTermForm {...formProps} />
    </Dialog>
  );
}
