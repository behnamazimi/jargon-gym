import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveReviewDomainIdsForUser } from "@/lib/jargon/known-state";
import { getPoolStatsByDomainForUser, type PickContext } from "@/lib/trace-queue";

type Client = SupabaseClient<Database>;

export type CollectionStats = {
  id: string;
  name: string;
  isActive: boolean;
  knownCount: number;
  /** How many of knownCount came from the user manually marking a term
   *  known, rather than earning it through TRACE. */
  markedKnownCount: number;
  totalCount: number;
  percentage: number;
  unseen: number;
  seen: number;
};

export async function fetchCollectionStats(
  client: Client,
  userId: string,
  context: PickContext = "read",
): Promise<CollectionStats[]> {
  const { collectionRows, reviewDomainIds } = await resolveReviewDomainIdsForUser(client, userId);

  if (collectionRows.length === 0) return [];

  const activeSet = new Set(reviewDomainIds);
  const statsByDomain = await getPoolStatsByDomainForUser(client, userId, context);

  const stats: CollectionStats[] = collectionRows.map((row) => {
    const totalCount = row.termCount;
    const knownCount = row.knownCount;
    const percentage = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
    const queueStats = statsByDomain.get(row.id);

    return {
      id: row.id,
      name: row.name,
      isActive: activeSet.has(row.id),
      knownCount,
      markedKnownCount: row.markedKnownCount,
      totalCount,
      percentage,
      unseen: queueStats?.unseen ?? 0,
      seen: queueStats?.seen ?? 0,
    };
  });

  stats.sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return stats;
}

export * from "./collection-mastery-snapshot";
