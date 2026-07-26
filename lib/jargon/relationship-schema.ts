import { z } from "zod";

export const relationshipInputSchema = z.object({
  targetTermId: z.string().uuid("Choose a related term"),
  relationshipType: z.string().trim().min(1, "Relationship type is required"),
  description: z.string().optional().default(""),
});

export type RelationshipInput = z.infer<typeof relationshipInputSchema>;

export type RelationshipUpdateInput = RelationshipInput & {
  id: string;
};

export type RelationshipSyncPayload = {
  create: RelationshipInput[];
  update: RelationshipUpdateInput[];
  deleteIds: string[];
};

export type RelationshipDraft = {
  key: string;
  id?: string;
  direction: "outgoing" | "incoming";
  relatedTermId: string;
  relatedTermName: string;
  relationshipType: string;
  description: string;
};

export function parseRelationshipInput(
  input: unknown,
): { ok: true; data: RelationshipInput } | { ok: false; error: string } {
  const result = relationshipInputSchema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid relationship." };
  }
  return { ok: true, data: result.data };
}
