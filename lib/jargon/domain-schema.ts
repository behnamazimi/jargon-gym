import { z } from "zod";

const domainFieldsSchema = z.object({
  name: z.string().trim().min(1, "Domain name is required"),
  description: z.string().nullable().optional(),
});

export type DomainInput = z.infer<typeof domainFieldsSchema>;

export function parseDomainInput(
  input: unknown,
): { ok: true; data: DomainInput } | { ok: false; error: string } {
  const result = domainFieldsSchema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid domain data." };
  }
  return { ok: true, data: result.data };
}

export function domainInputToUpdateRow(input: DomainInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
  };
}
