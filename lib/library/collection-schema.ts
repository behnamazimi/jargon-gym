import { z } from "zod";
import { cleanText } from "@/lib/terms/text-clean";
import { COLLECTION_LANGUAGES } from "@/lib/terms/languages";

const collectionFieldsSchema = z.object({
  name: z.string().transform(cleanText).pipe(z.string().trim().min(1, "Enter a collection name")),
  description: z.string().transform(cleanText).nullable().optional(),
  language: z.enum(COLLECTION_LANGUAGES).default("en"),
});

export type CollectionInput = z.infer<typeof collectionFieldsSchema>;

export function parseCollectionInput(
  input: unknown,
): { ok: true; data: CollectionInput } | { ok: false; error: string } {
  const result = collectionFieldsSchema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid collection data." };
  }
  return { ok: true, data: result.data };
}

export function collectionInputToUpdateRow(input: CollectionInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    language: input.language,
  };
}

const newCollectionSchema = z.object({
  name: z
    .string()
    .transform(cleanText)
    .pipe(
      z
        .string()
        .trim()
        .min(1, "Enter a name for your collection.")
        .max(100, "Keep the name under 100 characters."),
    ),
  language: z.enum(COLLECTION_LANGUAGES).default("en"),
});

export type NewCollectionInput = z.infer<typeof newCollectionSchema>;

export function parseNewCollectionInput(
  input: unknown,
): { ok: true; data: NewCollectionInput } | { ok: false; error: string } {
  const result = newCollectionSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Invalid collection." };
  }
  return { ok: true, data: result.data };
}
