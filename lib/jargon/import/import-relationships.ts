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
    const sourceId = termIdByKey.get(normalizeTermKey(rel.source));
    const targetId = termIdByKey.get(normalizeTermKey(rel.target));

    if (!sourceId || !targetId) continue;
    if (sourceId === targetId) continue;

    const relationshipKey = normalizeRelationshipKey(rel.source, rel.target, rel.relationship_type);
    if (importedRelationshipKeys.has(relationshipKey)) continue;
    importedRelationshipKeys.add(relationshipKey);

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
        domain: payload.domain,
      });
    }

    if (existingRel) {
      if (existingRel.description !== description) {
        const { error } = await client
          .from("term_relationships")
          .update({ description })
          .eq("id", existingRel.id);

        if (error) {
          throwStepError(error, "Could not update relationship", {
            term: `${rel.source} → ${rel.target}`,
            domain: payload.domain,
          });
        }

        relationshipsUpdated += 1;
      }

      continue;
    }

    const { error } = await client.from("term_relationships").insert({
      source_term_id: sourceId,
      target_term_id: targetId,
      relationship_type: relationshipType,
      description,
    });

    if (error) {
      if (isUniqueViolation(error)) continue;

      throwStepError(error, "Could not create relationship", {
        term: `${rel.source} → ${rel.target}`,
        domain: payload.domain,
      });
    }

    relationshipsCreated += 1;
  }

  return { relationshipsCreated, relationshipsUpdated };
}
