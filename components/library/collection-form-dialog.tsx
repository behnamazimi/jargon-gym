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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import type { CollectionInput } from "@/lib/library/collection-schema";
import { COLLECTION_LANGUAGE_OPTIONS } from "@/lib/terms/languages";
import type { Collection } from "@/lib/terms/types";

type CollectionFormDialogProps = {
  collection: Collection;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

function collectionToForm(collection: Collection): CollectionInput {
  return {
    name: collection.name,
    description: collection.description || null,
    language: collection.language,
  };
}

export function CollectionFormDialog({
  collection,
  isOpen,
  onOpenChange,
}: CollectionFormDialogProps) {
  const { updateOwnedCollection, isBusy, busyId, error, clearError } = useCollectionActions();
  const [form, setForm] = useState<CollectionInput>(() => collectionToForm(collection));
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      clearError();
      setForm(collectionToForm(collection));
    }

    wasOpenRef.current = isOpen;
  }, [isOpen, collection, clearError]);

  const isSubmitting = isBusy && busyId === collection.id;

  function updateField<K extends keyof CollectionInput>(key: K, value: CollectionInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload: CollectionInput = {
      name: form.name.trim(),
      description: form.description?.trim() ? form.description.trim() : null,
      language: form.language,
    };

    await updateOwnedCollection(collection.id, payload, () => onOpenChange(false));
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Edit collection</DialogTitle>
          <DialogDescription>Change the name, description, or content language.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field>
            <FieldLabel htmlFor="collection-name">Name</FieldLabel>
            <Input
              id="collection-name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="e.g. Startup Terms"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="collection-description">Description (optional)</FieldLabel>
            <Textarea
              id="collection-description"
              value={form.description ?? ""}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="What is this collection about?"
              className="min-h-24"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="collection-language">Content language</FieldLabel>
            <Select
              value={form.language}
              onChange={(key) => {
                if (key == null) return;
                updateField("language", key as CollectionInput["language"]);
              }}
            >
              <SelectTrigger id="collection-language" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLLECTION_LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} id={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
