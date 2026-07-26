import { z } from "zod";
import { termFieldsSchema } from "@/lib/jargon/term-schema";

const importRelationshipSchema = z.object({
  source: z.string().trim().min(1, "Source term is required"),
  target: z.string().trim().min(1, "Target term is required"),
  relationship_type: z.string().trim().min(1, "Relationship type is required"),
  description: z.string().optional().default(""),
});

export const importPayloadSchema = z.object({
  domain: z.string().trim().min(1, "Domain name is required"),
  description: z.string().nullable().optional(),
  terms: z.array(termFieldsSchema).min(1, "At least one term is required"),
  relationships: z.array(importRelationshipSchema).optional().default([]),
});
