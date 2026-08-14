import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { pickReviewTermsForUser } from "@/lib/smart-queue/service";
import type { WidgetStateResponse, WidgetTerm } from "@/lib/widget/types";
import { resolveReviewDomainIdsForUser } from "./known-state";

type Client = SupabaseClient<Database>;

export const WIDGET_READ_BATCH_SIZE = 10;

/** Peeks up to WIDGET_READ_BATCH_SIZE unknown Read terms — never records a read. */
export async function fetchWidgetState(
  client: Client,
  userId: string,
  excludeTermIds: string[] = [],
): Promise<WidgetStateResponse> {
  const { reviewDomainIds, collectionRows } = await resolveReviewDomainIdsForUser(client, userId);

  if (reviewDomainIds.length === 0) {
    return { terms: [], totalCount: 0, knownCount: 0 };
  }

  const { cards } = await pickReviewTermsForUser(
    client,
    userId,
    { domainIds: reviewDomainIds },
    "unknown",
    WIDGET_READ_BATCH_SIZE,
    "read",
    excludeTermIds,
  );

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
