import { z } from "zod";
import type { ImportPayload } from "./types";

const importTermSchema = z.object({
  term: z.string().trim().min(1, "Term is required"),
  category: z.string().trim().min(1, "Category is required"),
  definition: z.string().trim().min(1, "Definition is required"),
  example: z.string().nullable().optional(),
  discussion: z.string().nullable().optional(),
  controversy: z.string().nullable().optional(),
});

const importRelationshipSchema = z.object({
  source: z.string().trim().min(1, "Source term is required"),
  target: z.string().trim().min(1, "Target term is required"),
  relationship_type: z.string().trim().min(1, "Relationship type is required"),
  description: z.string().optional().default(""),
});

export const importPayloadSchema = z.object({
  domain: z.string().trim().min(1, "Domain name is required"),
  description: z.string().nullable().optional(),
  terms: z.array(importTermSchema).min(1, "At least one term is required"),
  relationships: z.array(importRelationshipSchema).optional().default([]),
});

export type ParsedImportPayload = ImportPayload;
