import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { pickReadTermsForUser } from "@/lib/trace-queue";
import type { WidgetStateResponse, WidgetTerm } from "@/lib/widget/types";
import { resolveReviewDomainIdsForUser } from "./known-state";

type Client = SupabaseClient<Database>;

const WIDGET_POOL_SIZE = 2;

/** Peeks up to `limit` Read terms — never records a read. Single ranked
 *  pool, lowest exposure first — always has something to show as long as
 *  the active collections have any terms at all. */
export async function fetchWidgetState(
  client: Client,
  userId: string,
  excludeTermIds: string[] = [],
  limit: number = WIDGET_POOL_SIZE,
): Promise<WidgetStateResponse> {
  const { reviewDomainIds, collectionRows } = await resolveReviewDomainIdsForUser(client, userId);

  if (reviewDomainIds.length === 0) {
    return { terms: [], totalCount: 0, knownCount: 0 };
  }

  const scope = { domainIds: reviewDomainIds };
  const cards = await pickReadTermsForUser(client, userId, scope, limit, excludeTermIds);

  const terms: WidgetTerm[] = cards.map((card) => ({
    id: card.id,
    term: card.term,
    category: card.category,
    definition: card.definition,
    domainId: card.domainId,
    domainName: card.domainName,
  }));

  const activeSet = new Set(reviewDomainIds);
  let totalCount = 0;
  let knownCount = 0;
  for (const row of collectionRows) {
    if (!activeSet.has(row.id)) continue;
    totalCount += row.termCount;
    knownCount += row.knownCount;
  }

  return { terms, totalCount, knownCount };
}
