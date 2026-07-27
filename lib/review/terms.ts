import type { SupabaseClient } from "@supabase/supabase-js";
import { attachRelationshipsToTerms, mapTerm } from "@/lib/jargon/mappers";
import { resolveReviewDomainIds } from "@/lib/jargon/known-state";
import { fetchTermRelationshipsForTerms } from "@/lib/jargon/terms";
import type { Database } from "@/lib/supabase/database.types";
import type { ReviewTerm, ReviewTermStatus } from "./types";

type Client = SupabaseClient<Database>;

export const MAX_REVIEW_TERMS = 30;

export function getMaxReviewCardCount(availableTermCount: number): number {
  if (availableTermCount <= 0) return 0;
  return Math.min(availableTermCount, MAX_REVIEW_TERMS);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function fetchReviewTermPool(
  client: Client,
  userId: string,
  domainIds: string[] | "all",
  status: ReviewTermStatus,
  cardCount: number,
  shuffleTerms: boolean,
): Promise<ReviewTerm[]> {
  const { reviewDomainIds } = await resolveReviewDomainIds(client, userId);

  const scopedDomainIds =
    domainIds === "all"
      ? reviewDomainIds
      : domainIds.filter((domainId) => reviewDomainIds.includes(domainId));

  if (scopedDomainIds.length === 0) return [];

  const { data: domains, error: domainsError } = await client
    .from("domains")
    .select("id, name")
    .in("id", scopedDomainIds);

  if (domainsError) throw domainsError;

  const domainNameById = new Map(domains.map((domain) => [domain.id, domain.name]));

  const { data: termRows, error: termsError } = await client
    .from("terms")
    .select("*")
    .in("domain_id", scopedDomainIds);

  if (termsError) throw termsError;
  if (termRows.length === 0) return [];

  const termIds = termRows.map((term) => term.id);

  const { data: progress, error: progressError } = await client
    .from("user_progress")
    .select("term_id")
    .eq("user_id", userId)
    .eq("is_known", true)
    .in("term_id", termIds);

  if (progressError) throw progressError;

  const knownIds = new Set(progress.map((row) => row.term_id));

  const filtered = termRows.filter((term) =>
    status === "known" ? knownIds.has(term.id) : !knownIds.has(term.id),
  );

  if (filtered.length === 0) return [];

  const ordered = shuffleTerms
    ? shuffle(filtered)
    : [...filtered].sort((a, b) => a.term.localeCompare(b.term));

  const limit = Math.min(Math.max(1, Math.floor(cardCount)), ordered.length);
  const selected = ordered.slice(0, limit);

  const mappedTerms = selected.map(mapTerm);
  const selectedIds = mappedTerms.map((term) => term.id);
  const relationshipRows = await fetchTermRelationshipsForTerms(client, selectedIds);
  const termsWithRelationships = attachRelationshipsToTerms(mappedTerms, relationshipRows);

  return termsWithRelationships.map((term) => {
    const domainId = selected.find((row) => row.id === term.id)?.domain_id;
    return {
      ...term,
      domainName: domainId ? (domainNameById.get(domainId) ?? "Unknown") : "Unknown",
    };
  });
}
