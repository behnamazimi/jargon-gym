import type { TermFormValues } from "@/lib/jargon/term-schema";
import type { Term } from "@/lib/jargon/types";

export const emptyDetails = {
  example: "",
  mental_model: "",
  discussion: "",
  anti_example: "",
  controversy: "",
  note: "",
};

export function termToForm(term: Term): TermFormValues {
  return {
    term: term.term,
    category: term.category ?? "",
    definition: term.definition,
    example: term.example || "",
    mental_model: term.mentalModel || "",
    discussion: term.discussion || "",
    anti_example: term.antiExample || "",
    controversy: term.controversy || "",
    note: term.note || "",
  };
}

function blankToNull(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

export function buildTermPayload(form: TermFormValues): TermFormValues {
  return {
    ...form,
    example: blankToNull(form.example),
    mental_model: blankToNull(form.mental_model),
    discussion: blankToNull(form.discussion),
    anti_example: blankToNull(form.anti_example),
    controversy: blankToNull(form.controversy),
    note: blankToNull(form.note),
  };
}
