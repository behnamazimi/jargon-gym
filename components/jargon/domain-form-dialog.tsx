"use client";

import { useEffect, useRef, useState } from "react";
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
import { useCollectionActions } from "@/hooks/use-collection-actions";
import type { DomainInput } from "@/lib/jargon/domain-schema";
import type { Domain } from "@/lib/jargon/types";

type DomainFormDialogProps = {
  domain: Domain;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

function domainToForm(domain: Domain): DomainInput {
  return {
    name: domain.name,
    description: domain.description || null,
  };
}

export function DomainFormDialog({ domain, isOpen, onOpenChange }: DomainFormDialogProps) {
  const { updateOwnedDomain, isBusy, busyId, error, clearError } = useCollectionActions();
  const [form, setForm] = useState<DomainInput>(() => domainToForm(domain));
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      clearError();
      setForm(domainToForm(domain));
    }

    wasOpenRef.current = isOpen;
  }, [isOpen, domain, clearError]);

  const isSubmitting = isBusy && busyId === domain.id;

  function updateField<K extends keyof DomainInput>(key: K, value: DomainInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload: DomainInput = {
      name: form.name.trim(),
      description: form.description?.trim() ? form.description.trim() : null,
    };

    await updateOwnedDomain(domain.id, payload, () => onOpenChange(false));
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Edit domain</DialogTitle>
          <DialogDescription>
            Update the name and description for this collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field>
            <FieldLabel htmlFor="domain-name">Name</FieldLabel>
            <Input
              id="domain-name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="e.g. Startup Jargon"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="domain-description">Description (optional)</FieldLabel>
            <Textarea
              id="domain-description"
              value={form.description ?? ""}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="What is this collection about?"
              className="min-h-24"
            />
          </Field>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
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
    </Dialog>
  );
}
