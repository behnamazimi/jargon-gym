import { z } from "zod";
import { cleanText } from "@/lib/jargon/text-clean";

/** Blank means "none": the term is saved without it. */
const optionalTrimmed = z
  .string()
  .nullish()
  .transform((value) => cleanText(value ?? "").trim() || null);

const detail = z.string().transform(cleanText).nullable().optional();

export const termFieldsSchema = z.object({
  term: z.string().transform(cleanText).pipe(z.string().trim().min(1, "Enter a term")),
  category: optionalTrimmed,
  definition: optionalTrimmed,
  example: detail,
  mental_model: detail,
  discussion: detail,
  anti_example: detail,
  controversy: detail,
  note: detail,
});

/** What a form or action sends in. */
export type TermInput = z.input<typeof termFieldsSchema>;

/** What the schema returns: blanks are already null. */
export type ParsedTerm = z.output<typeof termFieldsSchema>;

/** Form state: text inputs always hold a string. */
export type TermFormValues = TermInput & { category: string; definition: string };

export function parseTermInput(
  input: unknown,
): { ok: true; data: ParsedTerm } | { ok: false; error: string } {
  const result = termFieldsSchema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid term data." };
  }
  return { ok: true, data: result.data };
}

function trimOrNull(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function trimmedOptionalFields(input: ParsedTerm) {
  return {
    example: trimOrNull(input.example),
    mental_model: trimOrNull(input.mental_model),
    discussion: trimOrNull(input.discussion),
    anti_example: trimOrNull(input.anti_example),
    controversy: trimOrNull(input.controversy),
    note: trimOrNull(input.note),
  };
}

export function termInputToRow(input: ParsedTerm, domainId: string) {
  return {
    term: input.term.trim(),
    category: input.category,
    definition: input.definition,
    ...trimmedOptionalFields(input),
    domain_id: domainId,
  };
}

export function termInputToUpdateRow(input: ParsedTerm) {
  return {
    term: input.term.trim(),
    category: input.category,
    definition: input.definition,
    ...trimmedOptionalFields(input),
  };
}
