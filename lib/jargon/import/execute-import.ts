import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createOrGetOwnedDomain } from "@/lib/jargon/collections";
import { formatImportFailure, ImportExecutionError } from "./errors";
import { importRelationships } from "./import-relationships";
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

async function domainExisted(client: Client, ownerId: string, domainName: string) {
  const { data: existingDomain, error } = await client
    .from("domains")
    .select("id")
    .eq("owner_id", ownerId)
    .ilike("name", domainName)
    .maybeSingle();

  if (error) {
    throwStepError(error, "Could not look up domain", { domain: domainName });
  }

  return Boolean(existingDomain);
}

async function resolveImportDomain(client: Client, ownerId: string, payload: ImportPayload) {
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

  return domain;
}

function trimOrNull(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function buildTermRow(item: ImportPayload["terms"][number], domainId: string) {
  return {
    term: item.term.trim(),
    category: item.category.trim(),
    definition: item.definition.trim(),
    example: trimOrNull(item.example),
    mental_model: trimOrNull(item.mental_model),
    discussion: trimOrNull(item.discussion),
    anti_example: trimOrNull(item.anti_example),
    controversy: trimOrNull(item.controversy),
    domain_id: domainId,
  };
}

async function upsertImportTerm(
  client: Client,
  domainId: string,
  domainName: string,
  item: ImportPayload["terms"][number],
): Promise<{ id: string; wasUpdate: boolean }> {
  const { data: existingTerm, error: existingTermError } = await client
    .from("terms")
    .select("id")
    .eq("domain_id", domainId)
    .ilike("term", item.term)
    .maybeSingle();

  if (existingTermError) {
    throwStepError(existingTermError, "Could not check existing term", {
      term: item.term,
      domain: domainName,
    });
  }

  const row = buildTermRow(item, domainId);

  if (existingTerm) {
    const { error } = await client.from("terms").update(row).eq("id", existingTerm.id);
    if (error) {
      throwStepError(error, "Could not update term", { term: item.term, domain: domainName });
    }
    return { id: existingTerm.id, wasUpdate: true };
  }

  const { data, error } = await client.from("terms").insert(row).select("id").single();
  if (error || !data) {
    throwStepError(error ?? new Error("Term insert returned no row"), "Could not create term", {
      term: item.term,
      domain: domainName,
    });
  }
  return { id: data.id, wasUpdate: false };
}

async function markDomainActive(
  client: Client,
  ownerId: string,
  domainId: string,
  domainName: string,
) {
  const { error } = await client
    .from("user_active_domains")
    .upsert(
      { user_id: ownerId, domain_id: domainId },
      { onConflict: "user_id,domain_id", ignoreDuplicates: true },
    );

  if (error) {
    throwStepError(error, "Import succeeded but domain could not be marked active", {
      domain: domainName,
    });
  }
}

export async function executeImport(
  client: Client,
  ownerId: string,
  payload: ImportPayload,
  options: { isMerge: boolean },
): Promise<ImportResult> {
  const hadExisting = await domainExisted(client, ownerId, payload.domain);
  const domain = await resolveImportDomain(client, ownerId, payload);

  let termsCreated = 0;
  let termsUpdated = 0;
  const termIdByKey = new Map<string, string>();

  for (const item of payload.terms) {
    const { id, wasUpdate } = await upsertImportTerm(client, domain.id, payload.domain, item);
    termIdByKey.set(normalizeTermKey(item.term), id);
    if (wasUpdate) {
      termsUpdated += 1;
    } else {
      termsCreated += 1;
    }
  }

  const { relationshipsCreated, relationshipsUpdated } = await importRelationships(
    client,
    domain,
    payload,
    termIdByKey,
    normalizeTermKey,
  );

  await markDomainActive(client, ownerId, domain.id, payload.domain);

  return {
    domainId: domain.id,
    domainName: domain.name,
    termsCreated,
    termsUpdated: options.isMerge || hadExisting ? termsUpdated : 0,
    relationshipsCreated,
    relationshipsUpdated,
  };
}
