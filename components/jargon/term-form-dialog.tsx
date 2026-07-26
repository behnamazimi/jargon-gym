"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { TermRelationshipsEditor } from "@/components/jargon/term-relationships-editor";
import { useTermActions } from "@/hooks/use-term-actions";
import type { RelationshipDraft } from "@/lib/jargon/relationship-schema";
import {
  buildRelationshipSync,
  termRelationshipsToDrafts,
  validateRelationshipDrafts,
} from "@/lib/jargon/relationship-sync";
import type { TermInput } from "@/lib/jargon/term-schema";
import type { Term } from "@/lib/jargon/types";

type TermFormDialogProps = {
  mode: "create" | "edit";
  domainId: string;
  domainTerms: Term[];
  initialTerm?: Term;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

const emptyForm: TermInput = {
  term: "",
  category: "",
  definition: "",
  example: "",
  discussion: "",
  controversy: "",
};

function termToForm(term: Term): TermInput {
  return {
    term: term.term,
    category: term.category,
    definition: term.definition,
    example: term.example || "",
    discussion: term.discussion || "",
    controversy: term.controversy || "",
  };
}

export function TermFormDialog({
  mode,
  domainId,
  domainTerms,
  initialTerm,
  isOpen,
  onOpenChange,
  onSaved,
}: TermFormDialogProps) {
  const { createTerm, updateTerm, isBusy, busyId, error, clearError } = useTermActions();
  const [form, setForm] = useState<TermInput>(emptyForm);
  const [relationshipDrafts, setRelationshipDrafts] = useState<RelationshipDraft[]>([]);
  const [initialRelationshipDrafts, setInitialRelationshipDrafts] = useState<RelationshipDraft[]>(
    [],
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      clearError();
      setValidationError(null);
      setForm(mode === "edit" && initialTerm ? termToForm(initialTerm) : emptyForm);

      const nextRelationships =
        mode === "edit" && initialTerm ? termRelationshipsToDrafts(initialTerm.relationships) : [];
      setRelationshipDrafts(nextRelationships);
      setInitialRelationshipDrafts(nextRelationships);
    }

    wasOpenRef.current = isOpen;
  }, [isOpen, mode, initialTerm, clearError]);

  const busyKey = mode === "edit" ? initialTerm?.id : domainId;
  const isSubmitting = isBusy && busyId === busyKey;
  const displayError = validationError ?? error;

  const sourceTermId = mode === "edit" ? initialTerm?.id : undefined;

  function updateField<K extends keyof TermInput>(key: K, value: TermInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    const relationshipValidation = validateRelationshipDrafts(relationshipDrafts, sourceTermId);
    if (relationshipValidation) {
      setValidationError(relationshipValidation);
      return;
    }

    const payload: TermInput = {
      ...form,
      example: form.example?.trim() ? form.example : null,
      discussion: form.discussion?.trim() ? form.discussion : null,
      controversy: form.controversy?.trim() ? form.controversy : null,
    };

    const relationshipSync = buildRelationshipSync(initialRelationshipDrafts, relationshipDrafts);

    const success =
      mode === "create"
        ? await createTerm(domainId, payload, { create: relationshipSync.create }, () =>
            onOpenChange(false),
          )
        : initialTerm
          ? await updateTerm(initialTerm.id, payload, relationshipSync, () => onOpenChange(false))
          : false;

    if (success) {
      onSaved?.();
    }
  }

  const canManageRelationships = useMemo(() => {
    if (mode === "edit") return true;
    return domainTerms.length > 0;
  }, [mode, domainTerms.length]);

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add term" : "Edit term"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a single term to this collection. You can link it to other terms below."
              : "Update this term and manage its relationships with other terms in the collection."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
          <Field>
            <FieldLabel htmlFor="term-name">Term</FieldLabel>
            <Input
              id="term-name"
              value={form.term}
              onChange={(event) => updateField("term", event.target.value)}
              placeholder="e.g. Coupling"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="term-category">Category</FieldLabel>
            <Input
              id="term-category"
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
              placeholder="e.g. Architecture"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="term-definition">Definition</FieldLabel>
            <Textarea
              id="term-definition"
              value={form.definition}
              onChange={(event) => updateField("definition", event.target.value)}
              placeholder="What does this term mean?"
              className="min-h-24"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="term-example">Example (optional)</FieldLabel>
            <Textarea
              id="term-example"
              value={form.example ?? ""}
              onChange={(event) => updateField("example", event.target.value)}
              className="min-h-20"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="term-discussion">In practice (optional)</FieldLabel>
            <Textarea
              id="term-discussion"
              value={form.discussion ?? ""}
              onChange={(event) => updateField("discussion", event.target.value)}
              className="min-h-20"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="term-controversy">Debated (optional)</FieldLabel>
            <Textarea
              id="term-controversy"
              value={form.controversy ?? ""}
              onChange={(event) => updateField("controversy", event.target.value)}
              className="min-h-20"
            />
          </Field>

          {canManageRelationships ? (
            <TermRelationshipsEditor
              drafts={relationshipDrafts}
              onChange={setRelationshipDrafts}
              domainTerms={domainTerms}
              sourceTermId={sourceTermId}
            />
          ) : null}
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
          <Button type="submit" isDisabled={isSubmitting}>
            {isSubmitting ? "Saving…" : mode === "create" ? "Add term" : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
