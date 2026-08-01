import { z } from "zod";

export const termFieldsSchema = z.object({
  term: z.string().trim().min(1, "Enter a term"),
  category: z.string().trim().min(1, "Enter a category"),
  definition: z.string().trim().min(1, "Enter a definition"),
  example: z.string().nullable().optional(),
  discussion: z.string().nullable().optional(),
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

export function termInputToRow(input: TermInput, domainId: string) {
  return {
    term: input.term.trim(),
    category: input.category.trim(),
    definition: input.definition.trim(),
    example: input.example?.trim() || null,
    discussion: input.discussion?.trim() || null,
    controversy: input.controversy?.trim() || null,
    domain_id: domainId,
  };
}

export function termInputToUpdateRow(input: TermInput) {
  return {
    term: input.term.trim(),
    category: input.category.trim(),
    definition: input.definition.trim(),
    example: input.example?.trim() || null,
    discussion: input.discussion?.trim() || null,
    controversy: input.controversy?.trim() || null,
  };
}
