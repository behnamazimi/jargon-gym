import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { computeContentHash } from "./content-hash";
import type { CollectionNarrationCoverage } from "./sync-shared";
import type { NarratedTermFields } from "./types";

type AdminClient = SupabaseClient<Database>;

type TermRow = { id: string; domain_id: string } & NarratedTermFields;

type NarrationCacheRow = {
  term_id: string;
  status: string;
  content_hash: string;
  storage_path: string | null;
};

const TERM_FIELD_COLUMNS =
  "id, domain_id, term, definition, example, mental_model, discussion, anti_example, controversy";

/** PostgREST's default max-rows cap. */
const PAGE_SIZE = 1000;
/** Keep `.in()` query strings under Kong/PostgREST URL limits. */
const IN_FILTER_CHUNK = 80;

export function isCurrentNarration(
  fields: NarratedTermFields,
  row: { status: string; content_hash: string; storage_path: string | null } | null | undefined,
): boolean {
  return (
    row?.status === "ready" &&
    row.content_hash === computeContentHash(fields) &&
    Boolean(row.storage_path)
  );
}

function fieldsFromTerm(term: NarratedTermFields): NarratedTermFields {
  return {
    term: term.term,
    definition: term.definition,
    example: term.example,
    mental_model: term.mental_model,
    discussion: term.discussion,
    anti_example: term.anti_example,
    controversy: term.controversy,
  };
}

function chunkIds(ids: string[]): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_FILTER_CHUNK) {
    chunks.push(ids.slice(i, i + IN_FILTER_CHUNK));
  }
  return chunks;
}

async function fetchAllTermsForDomain(admin: AdminClient, domainId: string): Promise<TermRow[]> {
  const terms: TermRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from("terms")
      .select(TERM_FIELD_COLUMNS)
      .eq("domain_id", domainId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    terms.push(...((data ?? []) as TermRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return terms;
}

async function fetchAllTermsForDomains(
  admin: AdminClient,
  domainIds: string[],
): Promise<TermRow[]> {
  const terms: TermRow[] = [];
  for (const domainChunk of chunkIds(domainIds)) {
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await admin
        .from("terms")
        .select(TERM_FIELD_COLUMNS)
        .in("domain_id", domainChunk)
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      terms.push(...((data ?? []) as TermRow[]));
      if (!data || data.length < PAGE_SIZE) break;
    }
  }
  return terms;
}

async function loadNarrationRows(
  admin: AdminClient,
  termIds: string[],
): Promise<Map<string, NarrationCacheRow>> {
  const byTermId = new Map<string, NarrationCacheRow>();
  if (termIds.length === 0) return byTermId;

  for (const chunk of chunkIds(termIds)) {
    const { data, error } = await admin
      .from("term_narrations")
      .select("term_id, status, content_hash, storage_path")
      .in("term_id", chunk)
      .range(0, chunk.length - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      byTermId.set(row.term_id, row);
    }
  }
  return byTermId;
}

export async function listMissingNarrationTermIds(
  admin: AdminClient,
  domainId: string,
): Promise<string[]> {
  const terms = await fetchAllTermsForDomain(admin, domainId);
  if (terms.length === 0) return [];

  const narrations = await loadNarrationRows(
    admin,
    terms.map((term) => term.id),
  );

  return terms
    .filter((term) => !isCurrentNarration(fieldsFromTerm(term), narrations.get(term.id)))
    .map((term) => term.id);
}

export async function listCollectionNarrationCoverage(
  admin: AdminClient,
  collections: { id: string; name: string }[],
): Promise<CollectionNarrationCoverage[]> {
  if (collections.length === 0) return [];

  const terms = await fetchAllTermsForDomains(
    admin,
    collections.map((collection) => collection.id),
  );
  const narrations = await loadNarrationRows(
    admin,
    terms.map((term) => term.id),
  );

  const missingByDomain = new Map<string, number>();
  for (const term of terms) {
    if (isCurrentNarration(fieldsFromTerm(term), narrations.get(term.id))) continue;
    missingByDomain.set(term.domain_id, (missingByDomain.get(term.domain_id) ?? 0) + 1);
  }

  return collections.map((collection) => ({
    domainId: collection.id,
    name: collection.name,
    missingCount: missingByDomain.get(collection.id) ?? 0,
  }));
}
