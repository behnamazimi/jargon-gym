import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { formatImportFailure, ImportExecutionError } from "./errors";
import { normalizeRelationshipKey } from "./relationship-key";
import type { ImportPayload } from "./types";

type Client = SupabaseClient<Database>;

function throwStepError(
  err: unknown,
  step: string,
  context?: { term?: string; domain?: string },
): never {
  throw new ImportExecutionError(formatImportFailure(err, { step, ...context }));
}

function isUniqueViolation(error: { code?: string }) {
  return error.code === "23505";
}

type Rel = NonNullable<ImportPayload["relationships"]>[number];
type RelationshipOutcome = "created" | "updated" | "unchanged";

function resolveRelationshipEndpoints(
  rel: Rel,
  termIdByKey: Map<string, string>,
  normalizeTermKey: (term: string) => string,
): { sourceId: string; targetId: string } | null {
  const sourceId = termIdByKey.get(normalizeTermKey(rel.source));
  const targetId = termIdByKey.get(normalizeTermKey(rel.target));
  if (!sourceId || !targetId || sourceId === targetId) return null;
  return { sourceId, targetId };
}

async function updateExistingRelationship(
  client: Client,
  existingRel: { id: string; description: string },
  description: string,
  rel: Rel,
  domainName: string,
): Promise<RelationshipOutcome> {
  if (existingRel.description === description) return "unchanged";

  const { error } = await client
    .from("term_relationships")
    .update({ description })
    .eq("id", existingRel.id);

  if (error) {
    throwStepError(error, "Could not update relationship", {
      term: `${rel.source} → ${rel.target}`,
      domain: domainName,
    });
  }

  return "updated";
}

async function insertNewRelationship(
  client: Client,
  sourceId: string,
  targetId: string,
  relationshipType: string,
  description: string,
  rel: Rel,
  domainName: string,
): Promise<RelationshipOutcome> {
  const { error } = await client.from("term_relationships").insert({
    source_term_id: sourceId,
    target_term_id: targetId,
    relationship_type: relationshipType,
    description,
  });

  if (error) {
    if (isUniqueViolation(error)) return "unchanged";
    throwStepError(error, "Could not create relationship", {
      term: `${rel.source} → ${rel.target}`,
      domain: domainName,
    });
  }

  return "created";
}

async function upsertRelationship(
  client: Client,
  domainName: string,
  rel: Rel,
  sourceId: string,
  targetId: string,
): Promise<RelationshipOutcome> {
  const relationshipType = rel.relationship_type.trim();
  const description = rel.description?.trim() ?? "";

  const { data: existingRel, error: existingRelError } = await client
    .from("term_relationships")
    .select("id, description")
    .eq("source_term_id", sourceId)
    .eq("target_term_id", targetId)
    .ilike("relationship_type", relationshipType)
    .maybeSingle();

  if (existingRelError) {
    throwStepError(existingRelError, "Could not check relationship", {
      term: rel.source,
      domain: domainName,
    });
  }

  if (existingRel) {
    return updateExistingRelationship(client, existingRel, description, rel, domainName);
  }

  return insertNewRelationship(
    client,
    sourceId,
    targetId,
    relationshipType,
    description,
    rel,
    domainName,
  );
}

export async function importRelationships(
  client: Client,
  domain: { id: string; name: string },
  payload: ImportPayload,
  termIdByKey: Map<string, string>,
  normalizeTermKey: (term: string) => string,
): Promise<{ relationshipsCreated: number; relationshipsUpdated: number }> {
  let relationshipsCreated = 0;
  let relationshipsUpdated = 0;
  const importedRelationshipKeys = new Set<string>();

  for (const rel of payload.relationships ?? []) {
    const endpoints = resolveRelationshipEndpoints(rel, termIdByKey, normalizeTermKey);
    if (!endpoints) continue;

    const relationshipKey = normalizeRelationshipKey(rel.source, rel.target, rel.relationship_type);
    if (importedRelationshipKeys.has(relationshipKey)) continue;
    importedRelationshipKeys.add(relationshipKey);

    const outcome = await upsertRelationship(
      client,
      payload.domain,
      rel,
      endpoints.sourceId,
      endpoints.targetId,
    );

    if (outcome === "created") relationshipsCreated += 1;
    if (outcome === "updated") relationshipsUpdated += 1;
  }

  return { relationshipsCreated, relationshipsUpdated };
}
