import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { WidgetStateResponse, WidgetTerm } from "@/lib/widget/types";
import { fetchKnownTermIdsForDomains, resolveReviewDomainIdsForUser } from "./known-state";

type Client = SupabaseClient<Database>;

export async function fetchWidgetState(
  client: Client,
  userId: string,
): Promise<WidgetStateResponse> {
  const { reviewDomainIds } = await resolveReviewDomainIdsForUser(client, userId);

  if (reviewDomainIds.length === 0) {
    return {
      terms: [],
      knownTermIds: [],
      activeDomainIds: [],
      totalCount: 0,
      knownCount: 0,
    };
  }

  const { data: termRows, error: termsError } = await client
    .from("terms")
    .select("id, term, category, definition, domain_id, domains(name)")
    .in("domain_id", reviewDomainIds)
    .order("term");

  if (termsError) throw termsError;

  const terms: WidgetTerm[] = termRows.map((row) => ({
    id: row.id,
    term: row.term,
    category: row.category,
    definition: row.definition,
    domainId: row.domain_id,
    domainName: row.domains?.name ?? "Jargon",
  }));

  const knownTermIds = await fetchKnownTermIdsForDomains(client, reviewDomainIds, userId);
  const knownSet = new Set(knownTermIds);

  return {
    terms,
    knownTermIds,
    activeDomainIds: reviewDomainIds,
    totalCount: terms.length,
    knownCount: terms.filter((t) => knownSet.has(t.id)).length,
  };
}
