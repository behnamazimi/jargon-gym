import { z } from "zod";
import { termFieldsSchema } from "@/lib/jargon/term-schema";

const importRelationshipSchema = z.object({
  source: z.string().trim().min(1, "Enter a source term"),
  target: z.string().trim().min(1, "Enter a target term"),
  relationship_type: z.string().trim().min(1, "Enter a relationship type"),
  description: z.string().optional().default(""),
});

export const importPayloadSchema = z.object({
  domain: z.string().trim().min(1, "Enter a collection name"),
  description: z.string().nullable().optional(),
  terms: z.array(termFieldsSchema).min(1, "Add at least one term"),
  relationships: z.array(importRelationshipSchema).optional().default([]),
});
