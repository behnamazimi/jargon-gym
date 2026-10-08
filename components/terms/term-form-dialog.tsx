"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TermFormFields } from "@/components/terms/term-form-fields";
import { buildTermPayload, termToForm } from "@/components/terms/term-form-dialog-helpers";
import { useTermActions } from "@/hooks/use-term-actions";
import {
  buildRelationshipSync,
  termRelationshipsToDrafts,
  validateRelationshipDrafts,
} from "@/lib/terms/relationship-sync";
import type { RelationshipDraft } from "@/lib/terms/relationship-schema";
import type { TermFormValues } from "@/lib/terms/term-schema";
import type { LibraryTerm, Term } from "@/lib/terms/types";

type TermFormDialogProps = {
  collectionTerms: Pick<LibraryTerm, "id" | "term">[];
  initialTerm: Term;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

function EditTermForm({
  collectionTerms,
  initialTerm,
  onOpenChange,
}: Omit<TermFormDialogProps, "isOpen">) {
  const { updateTerm, isBusy, busyId, error } = useTermActions();
  const [form, setForm] = useState<TermFormValues>(() => termToForm(initialTerm));
  const [initialDrafts] = useState<RelationshipDraft[]>(() =>
    termRelationshipsToDrafts(initialTerm.relationships),
  );
  const [relationshipDrafts, setRelationshipDrafts] = useState(initialDrafts);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isSubmitting = isBusy && busyId === initialTerm.id;
  const displayError = validationError ?? error;

  function updateField<K extends keyof TermFormValues>(key: K, value: TermFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    const relationshipValidation = validateRelationshipDrafts(relationshipDrafts, initialTerm.id);
    if (relationshipValidation) {
      setValidationError(relationshipValidation);
      return;
    }

    await updateTerm(
      initialTerm.id,
      buildTermPayload(form),
      buildRelationshipSync(initialDrafts, relationshipDrafts),
      () => onOpenChange(false),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Edit term</DialogTitle>
        <DialogDescription>Update this term and its links to other terms.</DialogDescription>
      </DialogHeader>

      <TermFormFields
        form={form}
        onFieldChange={updateField}
        canManageRelationships
        relationshipDrafts={relationshipDrafts}
        onRelationshipDraftsChange={setRelationshipDrafts}
        collectionTerms={collectionTerms}
        sourceTermId={initialTerm.id}
      />

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
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TermFormDialog({
  collectionTerms,
  initialTerm,
  isOpen,
  onOpenChange,
}: TermFormDialogProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <EditTermForm
        collectionTerms={collectionTerms}
        initialTerm={initialTerm}
        onOpenChange={onOpenChange}
      />
    </Dialog>
  );
}
