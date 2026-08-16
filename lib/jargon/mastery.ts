import type { SupabaseClient } from "@supabase/supabase-js";
import type { OverallStrength } from "@/lib/smart-queue";
import type { Database } from "@/lib/supabase/database.types";
import {
  fetchKnownTermIdsForDomains,
  fetchOverallStrengthByTermId,
  resolveReviewDomainIds,
} from "./known-state";
import { fetchTermsByDomains } from "./terms";

type Client = SupabaseClient<Database>;

export type MasteryRow = {
  termId: string;
  term: string;
  category: string;
  domainId: string;
  domainName: string;
  known: boolean;
  score: number;
  bucket: OverallStrength;
  bars: number;
};

export type MasteryCollectionOption = {
  id: string;
  name: string;
  count: number;
};

export type MasteryOverviewData = {
  rows: MasteryRow[];
  collections: MasteryCollectionOption[];
};

/** Every term across every collection (active and paused — overall
 *  strength is pool/domain-status agnostic) with its blended strength,
 *  for the /jargon/mastery overview. Reuses the same per-term fetch the
 *  collection cards use (fetchOverallStrengthByTermId), just across all
 *  domains at once instead of one selected domain. */
export async function loadMasteryOverview(
  client: Client,
  userId: string,
): Promise<MasteryOverviewData> {
  const { collectionRows } = await resolveReviewDomainIds(client, userId);
  if (collectionRows.length === 0) return { rows: [], collections: [] };

  const domainIds = collectionRows.map((row) => row.id);
  const domainNameById = new Map(collectionRows.map((row) => [row.id, row.name]));

  const terms = await fetchTermsByDomains(client, domainIds);
  const termIds = terms.map((term) => term.id);

  const [knownTermIds, overallStrengthByTermId] = await Promise.all([
    fetchKnownTermIdsForDomains(client, domainIds, userId),
    fetchOverallStrengthByTermId(client, termIds, userId),
  ]);
  const knownSet = new Set(knownTermIds);

  const rows: MasteryRow[] = terms.map((term) => {
    const strength = overallStrengthByTermId[term.id];
    return {
      termId: term.id,
      term: term.term,
      category: term.category,
      domainId: term.domain_id,
      domainName: domainNameById.get(term.domain_id) ?? "",
      known: knownSet.has(term.id),
      score: strength?.score ?? 0,
      bucket: strength?.bucket ?? "unverified",
      bars: strength?.bars ?? 0,
    };
  });

  const collections: MasteryCollectionOption[] = collectionRows
    .map((row) => ({ id: row.id, name: row.name, count: row.termCount }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { rows, collections };
}
