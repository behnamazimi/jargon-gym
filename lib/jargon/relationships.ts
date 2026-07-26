import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { RelationshipInput, RelationshipSyncPayload } from "@/lib/jargon/relationship-schema";

type Client = SupabaseClient<Database>;

export class RelationshipMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelationshipMutationError";
  }
}

function isUniqueViolation(error: { code?: string }) {
  return error.code === "23505";
}

function duplicateRelationshipMessage() {
  return "A relationship with the same type already exists between these terms.";
}

async function createRelationship(
  client: Client,
  ownerId: string,
  sourceTermId: string,
  input: RelationshipInput,
) {
  if (sourceTermId === input.targetTermId) {
    throw new RelationshipMutationError("A term cannot relate to itself.");
  }

  const { error } = await client.from("term_relationships").insert({
    source_term_id: sourceTermId,
    target_term_id: input.targetTermId,
    relationship_type: input.relationshipType.trim(),
    description: input.description?.trim() ?? "",
    created_by: ownerId,
  });

  if (error) {
    if (isUniqueViolation(error)) {
      throw new RelationshipMutationError(duplicateRelationshipMessage());
    }
    throw error;
  }
}

async function updateRelationship(
  client: Client,
  relationshipId: string,
  input: RelationshipInput,
) {
  const { error } = await client
    .from("term_relationships")
    .update({
      target_term_id: input.targetTermId,
      relationship_type: input.relationshipType.trim(),
      description: input.description?.trim() ?? "",
    })
    .eq("id", relationshipId);

  if (error) {
    if (isUniqueViolation(error)) {
      throw new RelationshipMutationError(duplicateRelationshipMessage());
    }
    throw error;
  }
}

async function deleteRelationship(client: Client, relationshipId: string) {
  const { error } = await client.from("term_relationships").delete().eq("id", relationshipId);
  if (error) throw error;
}

export async function syncTermRelationships(
  client: Client,
  ownerId: string,
  sourceTermId: string,
  sync: RelationshipSyncPayload,
) {
  for (const relationshipId of sync.deleteIds) {
    await deleteRelationship(client, relationshipId);
  }

  for (const item of sync.update) {
    if (sourceTermId === item.targetTermId) {
      throw new RelationshipMutationError("A term cannot relate to itself.");
    }
    await updateRelationship(client, item.id, item);
  }

  for (const item of sync.create) {
    await createRelationship(client, ownerId, sourceTermId, item);
  }
}
