"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { TermFormFields } from "@/components/jargon/term-form-fields";
import {
  buildTermPayload,
  DialogHeaderText,
  emptyForm,
  getResetState,
  SubmitButtonLabel,
} from "@/components/jargon/term-form-dialog-helpers";
import { useTermActions } from "@/hooks/use-term-actions";
import type { RelationshipDraft } from "@/lib/jargon/relationship-schema";
import { buildRelationshipSync, validateRelationshipDrafts } from "@/lib/jargon/relationship-sync";
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
      const resetState = getResetState(mode, initialTerm);
      setForm(resetState.form);
      setRelationshipDrafts(resetState.relationshipDrafts);
      setInitialRelationshipDrafts(resetState.relationshipDrafts);
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

  async function saveTerm(
    payload: TermInput,
    relationshipSync: ReturnType<typeof buildRelationshipSync>,
  ) {
    const closeDialog = () => onOpenChange(false);

    if (mode === "create") {
      return createTerm(domainId, payload, { create: relationshipSync.create }, closeDialog);
    }
    if (initialTerm) {
      return updateTerm(initialTerm.id, payload, relationshipSync, closeDialog);
    }
    return false;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    const relationshipValidation = validateRelationshipDrafts(relationshipDrafts, sourceTermId);
    if (relationshipValidation) {
      setValidationError(relationshipValidation);
      return;
    }

    const payload = buildTermPayload(form);
    const relationshipSync = buildRelationshipSync(initialRelationshipDrafts, relationshipDrafts);
    const success = await saveTerm(payload, relationshipSync);

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
        <DialogHeaderText mode={mode} />

        <TermFormFields
          form={form}
          onFieldChange={updateField}
          canManageRelationships={canManageRelationships}
          relationshipDrafts={relationshipDrafts}
          onRelationshipDraftsChange={setRelationshipDrafts}
          domainTerms={domainTerms}
          sourceTermId={sourceTermId}
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
            <SubmitButtonLabel mode={mode} isSubmitting={isSubmitting} />
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
