"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useTermActions } from "@/hooks/use-term-actions";
import type { UnfinishedTerm } from "@/lib/jargon/types";

type FinishTermsDialogProps = {
  terms: UnfinishedTerm[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a term is finished or removed, so the page can reload. */
  onChanged: () => void | Promise<void>;
};

function FinishRow({
  term,
  onChanged,
}: {
  term: UnfinishedTerm;
  onChanged: () => void | Promise<void>;
}) {
  const { finishTerm, deleteTerm, isBusy, error } = useTermActions();
  const { toast } = useToast();
  const [definition, setDefinition] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const inputId = `finish-${term.id}`;

  async function handleSave() {
    if (!definition.trim() || isBusy) return;
    await finishTerm(term.id, { definition }, () => {
      toast(`Saved "${term.term}"`, "success");
      void onChanged();
    });
  }

  async function handleRemove() {
    setConfirmRemove(false);
    await deleteTerm(term.id);
    void onChanged();
  }

  return (
    <li className="space-y-2 rounded-xl bg-base-200/60 p-3">
      <Field>
        <FieldLabel htmlFor={inputId}>{term.term}</FieldLabel>
        <Textarea
          id={inputId}
          value={definition}
          className="min-h-20 text-base"
          placeholder="What does it mean?"
          onChange={(event) => setDefinition(event.target.value)}
        />
      </Field>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 md:min-h-8"
          isDisabled={isBusy}
          onPress={() => setConfirmRemove(true)}
        >
          Remove
        </Button>
        <Button
          type="button"
          size="sm"
          className="min-h-11 md:min-h-8"
          isDisabled={isBusy || !definition.trim()}
          onPress={() => void handleSave()}
        >
          {isBusy ? "Saving…" : "Save"}
        </Button>
      </div>

      <AlertDialog isOpen={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove &ldquo;{term.term}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            It has no progress yet, so nothing else is lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onPress={() => void handleRemove()}>Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </li>
  );
}

export function FinishTermsDialog({
  terms,
  isOpen,
  onOpenChange,
  onChanged,
}: FinishTermsDialogProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Finish terms</DialogTitle>
        <DialogDescription>
          Add a definition and the term joins Read, Review and Quiz.
        </DialogDescription>
      </DialogHeader>

      {terms.length === 0 ? (
        <p className="m-0 py-6 text-center text-sm text-base-content/60">All terms finished.</p>
      ) : (
        <ul className="m-0 flex min-h-0 list-none flex-col gap-3 overflow-y-auto p-0">
          {terms.map((term) => (
            <FinishRow key={term.id} term={term} onChanged={onChanged} />
          ))}
        </ul>
      )}

      <DialogFooter className="shrink-0">
        <Button type="button" variant="outline" onPress={() => onOpenChange(false)}>
          Done
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
