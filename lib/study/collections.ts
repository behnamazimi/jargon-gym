import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchUserCollectionDomains } from "@/lib/jargon/collections";
import type { PausedStudyCollection, StudyCollection } from "./types";

type Client = SupabaseClient<Database>;

async function fetchTermCounts(client: Client): Promise<Map<string, number>> {
  const { data, error } = await client.rpc("my_study_collection_term_counts");
  if (error) throw error;
  return new Map(data.map((row) => [row.domain_id, row.term_count]));
}

async function fetchActiveDomainIds(client: Client): Promise<Set<string>> {
  const { data, error } = await client.rpc("my_review_domain_ids");
  if (error) throw error;
  return new Set(data ?? []);
}

/** Active collections feed Read/Review/Quiz; paused ones are listed so a
 *  study page can offer to resume them instead of a dead end. Both empty
 *  means the user has no collections at all. */
export async function listStudyCollectionState(
  client: Client,
  userId: string,
): Promise<{ active: StudyCollection[]; paused: PausedStudyCollection[] }> {
  const [domains, activeIds, termCounts] = await Promise.all([
    fetchUserCollectionDomains(client, userId),
    fetchActiveDomainIds(client),
    fetchTermCounts(client),
  ]);

  const active: StudyCollection[] = [];
  const paused: PausedStudyCollection[] = [];
  for (const domain of domains) {
    if (activeIds.has(domain.id)) {
      active.push({ id: domain.id, name: domain.name, termCount: termCounts.get(domain.id) ?? 0 });
    } else {
      paused.push({ id: domain.id, name: domain.name });
    }
  }

  return { active, paused };
}

export function hasNoCollections(state: { active: unknown[]; paused: unknown[] }): boolean {
  return state.active.length === 0 && state.paused.length === 0;
}
