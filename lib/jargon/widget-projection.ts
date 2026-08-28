import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getReadModeForUser } from "@/lib/jargon/read-settings";
import { pickReviewTermsForUser, pickStaleKnownTermsForUser } from "@/lib/smart-queue/service";
import type { WidgetStateResponse, WidgetTerm } from "@/lib/widget/types";
import { resolveReviewDomainIdsForUser } from "./known-state";

type Client = SupabaseClient<Database>;

const WIDGET_POOL_SIZE = 2;

/** Peeks up to `limit` Read terms — never records a read. Unknown pool
 *  first, same as the web Read action; falls back to stale known terms
 *  only if the unknown pick is empty and read_mode === "stale_known", so
 *  the widget stops going silently empty once a collection is fully read. */
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
  let { cards } = await pickReviewTermsForUser(
    client,
    userId,
    scope,
    "unknown",
    limit,
    "read",
    excludeTermIds,
  );

  if (cards.length === 0) {
    const readMode = await getReadModeForUser(client, userId);
    if (readMode === "stale_known") {
      const fallback = await pickStaleKnownTermsForUser(
        client,
        userId,
        scope,
        limit,
        excludeTermIds,
      );
      cards = fallback.cards;
    }
  }

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
