import { z } from "zod";
import { DOMAIN_LANGUAGES } from "@/lib/jargon/languages";

export const MAX_IMPORT_TERMS = 500;

const shortText = z.string().max(200);
const longText = z.string().max(4000);

const commitTermSchema = z.object({
  term: shortText.trim().min(1),
  definition: longText.optional(),
  category: shortText.optional(),
  example: longText.optional(),
  mental_model: longText.optional(),
  discussion: longText.optional(),
  anti_example: longText.optional(),
  controversy: longText.optional(),
  note: longText.optional(),
  on_duplicate: z.enum(["skip", "update"]).optional(),
});

const linkSchema = z.object({
  source: shortText,
  target: shortText,
  relationship_type: shortText,
  description: longText.optional(),
});

const destinationSchema = z.union([
  z.object({ domainId: z.string().uuid() }),
  z.object({ name: z.string().trim().min(1).max(100), language: z.enum(DOMAIN_LANGUAGES) }),
]);

const IMPORT_FORMATS = [
  "json",
  "html_table",
  "anki",
  "tsv",
  "csv",
  "lines",
  "pairs",
  "words",
] as const;

export const commitImportSchema = z.object({
  importId: z.string().uuid(),
  destination: destinationSchema,
  terms: z.array(commitTermSchema).min(1).max(MAX_IMPORT_TERMS),
  links: z.array(linkSchema).max(2000).default([]),
  policy: z.enum(["skip", "update"]),
  entry: z.enum(["chooser", "collection", "capture"]),
  source: z.enum(["paste", "file", "json"]),
  format: z.enum(IMPORT_FORMATS),
});

export type CommitImportInput = z.infer<typeof commitImportSchema>;

export const batchResultSchema = z.object({
  domain_id: z.string(),
  domain_name: z.string(),
  created: z.number(),
  updated: z.number(),
  skipped: z.number(),
  unfinished: z.number(),
  relationships_created: z.number(),
  relationships_updated: z.number(),
  relationships_dropped: z.number(),
  already_applied: z.boolean().optional(),
});
