import { z } from "zod";

const relationshipInputSchema = z.object({
  targetTermId: z.string().uuid("Choose a related term"),
  relationshipType: z.string().trim().min(1, "Relationship type is required"),
  description: z.string().optional().default(""),
});

export type RelationshipInput = z.infer<typeof relationshipInputSchema>;

type RelationshipUpdateInput = RelationshipInput & {
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
