import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveReviewDomainIds } from "@/lib/jargon/known-state";
import type { StudyCollection } from "./types";

type Client = SupabaseClient<Database>;

/** Every tier ranks the same single term set now, so a collection's "terms
 *  available" is just its total term count — already computed by
 *  resolveReviewDomainIds's fetchUserCollection, no extra RPC needed. */
export async function listStudyCollections(
  client: Client,
  userId: string,
): Promise<StudyCollection[]> {
  const { reviewDomainIds, collectionRows } = await resolveReviewDomainIds(client, userId);

  const activeDomains = collectionRows.filter((domain) => reviewDomainIds.includes(domain.id));

  return activeDomains.map((domain) => ({
    id: domain.id,
    name: domain.name,
    termCount: domain.termCount,
  }));
}
