import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createOrGetOwnedDomain } from "@/lib/jargon/collections";
import { formatImportFailure, ImportExecutionError } from "./errors";
import { normalizeRelationshipKey } from "./relationship-key";
import type { ImportPayload, ImportResult } from "./types";

type Client = SupabaseClient<Database>;

function normalizeTermKey(term: string) {
  return term.trim().toLowerCase();
}

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

export async function executeImport(
  client: Client,
  ownerId: string,
  payload: ImportPayload,
  options: { isMerge: boolean },
): Promise<ImportResult> {
  const { data: existingDomain, error: existingDomainError } = await client
    .from("domains")
    .select("id")
    .eq("owner_id", ownerId)
    .ilike("name", payload.domain)
    .maybeSingle();

  if (existingDomainError) {
    throwStepError(existingDomainError, "Could not look up domain", { domain: payload.domain });
  }

  const hadExisting = Boolean(existingDomain);

  let domain;
  try {
    domain = await createOrGetOwnedDomain(client, ownerId, payload.domain, payload.description);
  } catch (err) {
    throwStepError(err, "Could not create or open domain", { domain: payload.domain });
  }

  if (!domain) {
    throw new ImportExecutionError({
      title: "Could not create or open domain",
      message: `Domain "${payload.domain}" could not be loaded.`,
      context: { domain: payload.domain },
    });
  }

  let termsCreated = 0;
  let termsUpdated = 0;

  const termIdByKey = new Map<string, string>();

  for (const item of payload.terms) {
    const key = normalizeTermKey(item.term);

    const { data: existingTerm, error: existingTermError } = await client
      .from("terms")
      .select("id")
      .eq("domain_id", domain.id)
      .ilike("term", item.term)
      .maybeSingle();

    if (existingTermError) {
      throwStepError(existingTermError, "Could not check existing term", {
        term: item.term,
        domain: payload.domain,
      });
    }

    const row = {
      term: item.term.trim(),
      category: item.category.trim(),
      definition: item.definition.trim(),
      example: item.example?.trim() || null,
      mental_model: item.mental_model?.trim() || null,
      discussion: item.discussion?.trim() || null,
      anti_example: item.anti_example?.trim() || null,
      controversy: item.controversy?.trim() || null,
      domain_id: domain.id,
    };

    if (existingTerm) {
      const { error } = await client.from("terms").update(row).eq("id", existingTerm.id);
      if (error) {
        throwStepError(error, "Could not update term", {
          term: item.term,
          domain: payload.domain,
        });
      }
      termIdByKey.set(key, existingTerm.id);
      termsUpdated += 1;
    } else {
      const { data, error } = await client.from("terms").insert(row).select("id").single();
      if (error || !data) {
        throwStepError(error ?? new Error("Term insert returned no row"), "Could not create term", {
          term: item.term,
          domain: payload.domain,
        });
      }
      termIdByKey.set(key, data.id);
      termsCreated += 1;
    }
  }

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

  const { error: activeError } = await client.from("user_active_domains").upsert(
    {
      user_id: ownerId,
      domain_id: domain.id,
    },
    { onConflict: "user_id,domain_id", ignoreDuplicates: true },
  );

  if (activeError) {
    throwStepError(activeError, "Import succeeded but domain could not be marked active", {
      domain: payload.domain,
    });
  }

  return {
    domainId: domain.id,
    domainName: domain.name,
    termsCreated,
    termsUpdated: options.isMerge || hadExisting ? termsUpdated : 0,
    relationshipsCreated,
    relationshipsUpdated,
  };
}
