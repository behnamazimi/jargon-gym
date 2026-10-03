"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import { findSimilarName } from "@/lib/import/similar-name";
import type { DomainLanguage } from "@/lib/terms/languages";

type ExistingCollection = { id: string; name: string };

type CreateCollectionDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  existingCollections: ExistingCollection[];
};

function CreateCollectionForm({
  existingCollections,
  onClose,
}: {
  existingCollections: ExistingCollection[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { createEmptyCollection, isBusy, error } = useCollectionActions();
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<DomainLanguage>("en");

  const similar = findSimilarName(
    name,
    existingCollections.map((collection) => collection.name),
  );
  const match = similar
    ? existingCollections.find((collection) => collection.name === similar.name)
    : undefined;
  const isExact = similar?.kind === "exact";
  const canCreate = name.trim().length > 0 && !isExact && !isBusy;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canCreate) return;

    await createEmptyCollection({ name: name.trim(), language }, (domainId) => {
      onClose();
      router.push(`/jargon?domain=${domainId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>New collection</DialogTitle>
        <DialogDescription>
          Name it, pick a language, then add terms one at a time.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <Field>
          <FieldLabel htmlFor="new-collection-name">Name</FieldLabel>
          <Input
            id="new-collection-name"
            value={name}
            autoFocus
            className="text-base"
            placeholder="e.g. Startup finance"
            maxLength={100}
            disabled={isBusy}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel>Language</FieldLabel>
          <LanguageToggle value={language} onChange={setLanguage} isDisabled={isBusy} />
        </Field>
      </div>

      {similar && match ? (
        <Alert variant={isExact ? "destructive" : "default"}>
          <AlertDescription>
            {isExact
              ? `You already have a collection named "${match.name}".`
              : `You already have "${match.name}". Open it instead?`}
          </AlertDescription>
          <AlertAction>
            <LinkButton href={`/jargon?domain=${match.id}`} size="sm" variant="outline">
              Open it
            </LinkButton>
          </AlertAction>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter className="shrink-0">
        <Button type="button" variant="outline" onPress={onClose}>
          Cancel
        </Button>
        <Button type="submit" isDisabled={!canCreate}>
          {isBusy ? "Creating…" : "Create collection"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreateCollectionDialog({
  isOpen,
  onOpenChange,
  existingCollections,
}: CreateCollectionDialogProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <CreateCollectionForm
        existingCollections={existingCollections}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}
