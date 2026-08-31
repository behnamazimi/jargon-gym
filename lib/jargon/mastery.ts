import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveReviewDomainIds } from "./known-state";

type Client = SupabaseClient<Database>;

export type MasteryCollectionRow = {
  domainId: string;
  domainName: string;
  knownCount: number;
  totalCount: number;
  percentage: number;
};

export type MasteryOverviewData = {
  rows: MasteryCollectionRow[];
};

/** Plain known/total/percentage per active collection (paused collections
 *  are excluded), for the /jargon/mastery overview. */
export async function loadMasteryOverview(
  client: Client,
  userId: string,
): Promise<MasteryOverviewData> {
  const { collectionRows, reviewDomainIds } = await resolveReviewDomainIds(client, userId);
  const activeSet = new Set(reviewDomainIds);
  const activeCollectionRows = collectionRows.filter((row) => activeSet.has(row.id));
  if (activeCollectionRows.length === 0) return { rows: [] };

  const rows: MasteryCollectionRow[] = activeCollectionRows
    .map((row) => {
      const totalCount = row.termCount;
      const knownCount = row.knownCount;
      const percentage = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
      return {
        domainId: row.id,
        domainName: row.name,
        knownCount,
        totalCount,
        percentage,
      };
    })
    .sort((a, b) => a.domainName.localeCompare(b.domainName));

  return { rows };
}
