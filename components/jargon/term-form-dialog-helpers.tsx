import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { termRelationshipsToDrafts } from "@/lib/jargon/relationship-sync";
import type { TermInput } from "@/lib/jargon/term-schema";
import type { Term } from "@/lib/jargon/types";

export const emptyForm: TermInput = {
  term: "",
  category: "",
  definition: "",
  example: "",
  mental_model: "",
  discussion: "",
  anti_example: "",
  controversy: "",
};

function termToForm(term: Term): TermInput {
  return {
    term: term.term,
    category: term.category,
    definition: term.definition,
    example: term.example || "",
    mental_model: term.mentalModel || "",
    discussion: term.discussion || "",
    anti_example: term.antiExample || "",
    controversy: term.controversy || "",
  };
}

function blankToNull(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

export function buildTermPayload(form: TermInput): TermInput {
  return {
    ...form,
    example: blankToNull(form.example),
    mental_model: blankToNull(form.mental_model),
    discussion: blankToNull(form.discussion),
    anti_example: blankToNull(form.anti_example),
    controversy: blankToNull(form.controversy),
  };
}

export function getResetState(mode: "create" | "edit", initialTerm: Term | undefined) {
  const editingExisting = mode === "edit" && initialTerm;
  return {
    form: editingExisting ? termToForm(initialTerm) : emptyForm,
    relationshipDrafts: editingExisting ? termRelationshipsToDrafts(initialTerm.relationships) : [],
  };
}

export function DialogHeaderText({ mode }: { mode: "create" | "edit" }) {
  return (
    <DialogHeader>
      <DialogTitle>{mode === "create" ? "Add term" : "Edit term"}</DialogTitle>
      <DialogDescription>
        {mode === "create"
          ? "Add a term to this collection. Link it to others below if you like."
          : "Update this term and its links to other terms."}
      </DialogDescription>
    </DialogHeader>
  );
}

export function SubmitButtonLabel({
  mode,
  isSubmitting,
}: {
  mode: "create" | "edit";
  isSubmitting: boolean;
}) {
  if (isSubmitting) return "Saving…";
  return mode === "create" ? "Add term" : "Save changes";
}
