import { z } from "zod";

export const termFieldsSchema = z.object({
  term: z.string().trim().min(1, "Enter a term"),
  category: z.string().trim().min(1, "Enter a category"),
  definition: z.string().trim().min(1, "Enter a definition"),
  example: z.string().nullable().optional(),
  mental_model: z.string().nullable().optional(),
  discussion: z.string().nullable().optional(),
  anti_example: z.string().nullable().optional(),
  controversy: z.string().nullable().optional(),
});

export type TermInput = z.infer<typeof termFieldsSchema>;

export function parseTermInput(
  input: unknown,
): { ok: true; data: TermInput } | { ok: false; error: string } {
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

function trimmedOptionalFields(input: TermInput) {
  return {
    example: trimOrNull(input.example),
    mental_model: trimOrNull(input.mental_model),
    discussion: trimOrNull(input.discussion),
    anti_example: trimOrNull(input.anti_example),
    controversy: trimOrNull(input.controversy),
  };
}

export function termInputToRow(input: TermInput, domainId: string) {
  return {
    term: input.term.trim(),
    category: input.category.trim(),
    definition: input.definition.trim(),
    ...trimmedOptionalFields(input),
    domain_id: domainId,
  };
}

export function termInputToUpdateRow(input: TermInput) {
  return {
    term: input.term.trim(),
    category: input.category.trim(),
    definition: input.definition.trim(),
    ...trimmedOptionalFields(input),
  };
}
