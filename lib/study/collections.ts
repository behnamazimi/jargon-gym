import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchUserCollections } from "@/lib/library/collections";
import type { PausedStudyCollection, StudyCollection } from "./types";

type Client = SupabaseClient<Database>;

async function fetchTermCounts(client: Client): Promise<Map<string, number>> {
  const { data, error } = await client.rpc("my_study_collection_term_counts");
  if (error) throw error;
  return new Map(data.map((row) => [row.collection_id, row.term_count]));
}

async function fetchActiveCollectionIds(client: Client): Promise<Set<string>> {
  const { data, error } = await client.rpc("my_review_collection_ids");
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
  const [collections, activeIds, termCounts] = await Promise.all([
    fetchUserCollections(client, userId),
    fetchActiveCollectionIds(client),
    fetchTermCounts(client),
  ]);

  const active: StudyCollection[] = [];
  const paused: PausedStudyCollection[] = [];
  for (const collection of collections) {
    if (activeIds.has(collection.id)) {
      active.push({
        id: collection.id,
        name: collection.name,
        termCount: termCounts.get(collection.id) ?? 0,
      });
    } else {
      paused.push({ id: collection.id, name: collection.name });
    }
  }

  return { active, paused };
}

export function hasNoCollections(state: { active: unknown[]; paused: unknown[] }): boolean {
  return state.active.length === 0 && state.paused.length === 0;
}
