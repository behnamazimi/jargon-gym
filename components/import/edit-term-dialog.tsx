"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DraftTerm } from "@/lib/import/parse/types";

type EditTermDialogProps = {
  draft: DraftTerm | null;
  onClose: () => void;
  onSave: (
    id: string,
    patch: { term: string; definition: string | null; category: string | null },
  ) => void;
};

function EditForm({
  draft,
  onClose,
  onSave,
}: {
  draft: DraftTerm;
  onClose: () => void;
  onSave: EditTermDialogProps["onSave"];
}) {
  const [term, setTerm] = useState(draft.term);
  const [definition, setDefinition] = useState(draft.definition ?? "");
  const [category, setCategory] = useState(draft.category ?? "");

  return (
    <form
      className="flex min-h-0 flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!term.trim()) return;
        onSave(draft.id, {
          term: term.trim(),
          definition: definition.trim() || null,
          category: category.trim() || null,
        });
        onClose();
      }}
    >
      <DialogHeader>
        <DialogTitle>Edit term</DialogTitle>
      </DialogHeader>
      <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
        <Field>
          <FieldLabel htmlFor="edit-term">Term</FieldLabel>
          <Input
            id="edit-term"
            value={term}
            className="text-base"
            autoFocus
            onChange={(event) => setTerm(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="edit-definition">Definition</FieldLabel>
          <Textarea
            id="edit-definition"
            value={definition}
            className="min-h-24 text-base"
            placeholder="What does it mean?"
            onChange={(event) => setDefinition(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="edit-category">Category (optional)</FieldLabel>
          <Input
            id="edit-category"
            value={category}
            className="text-base"
            onChange={(event) => setCategory(event.target.value)}
          />
        </Field>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onPress={onClose}>
          Cancel
        </Button>
        <Button type="submit" isDisabled={!term.trim()}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditTermDialog({ draft, onClose, onSave }: EditTermDialogProps) {
  return (
    <Dialog isOpen={draft !== null} onOpenChange={(open) => !open && onClose()}>
      {draft ? <EditForm key={draft.id} draft={draft} onClose={onClose} onSave={onSave} /> : null}
    </Dialog>
  );
}
