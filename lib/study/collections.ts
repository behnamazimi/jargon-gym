import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveReviewDomainIds } from "@/lib/jargon/known-state";
import type { PausedStudyCollection, StudyCollection } from "./types";

type Client = SupabaseClient<Database>;

/** Every tier ranks the same single term set now, so a collection's "terms
 *  available" is just its total term count — already computed by
 *  resolveReviewDomainIds's fetchUserCollection, no extra RPC needed. */
export async function listStudyCollections(
  client: Client,
  userId: string,
): Promise<StudyCollection[]> {
  return (await listStudyCollectionState(client, userId)).active;
}

/** Active collections feed Read/Review/Quiz; paused ones are listed so a
 *  study page can offer to resume them instead of a dead end. Both empty
 *  means the user has no collections at all. */
export async function listStudyCollectionState(
  client: Client,
  userId: string,
): Promise<{ active: StudyCollection[]; paused: PausedStudyCollection[] }> {
  const { reviewDomainIds, collectionRows } = await resolveReviewDomainIds(client, userId);

  const active: StudyCollection[] = [];
  const paused: PausedStudyCollection[] = [];
  for (const domain of collectionRows) {
    if (reviewDomainIds.includes(domain.id)) {
      active.push({ id: domain.id, name: domain.name, termCount: domain.termCount });
    } else {
      paused.push({ id: domain.id, name: domain.name });
    }
  }

  return { active, paused };
}

export function hasNoCollections(state: { active: unknown[]; paused: unknown[] }): boolean {
  return state.active.length === 0 && state.paused.length === 0;
}
