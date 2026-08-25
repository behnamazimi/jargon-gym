import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveReviewDomainIds } from "@/lib/jargon/known-state";
import type { StudyCollection } from "./types";

type Client = SupabaseClient<Database>;

export async function listStudyCollections(
  client: Client,
  userId: string,
): Promise<StudyCollection[]> {
  const { reviewDomainIds, collectionRows } = await resolveReviewDomainIds(client, userId);

  const activeDomains = collectionRows.filter((domain) => reviewDomainIds.includes(domain.id));
  if (activeDomains.length === 0) return [];

  const domainIds = activeDomains.map((domain) => domain.id);

  const { data, error } = await client.rpc("my_progress_state_by_domain", {
    p_domain_ids: domainIds,
  });

  if (error) throw error;

  const knownByDomain = new Map<string, number>();
  const unknownByDomain = new Map<string, number>();

  for (const domain of activeDomains) {
    knownByDomain.set(domain.id, 0);
    unknownByDomain.set(domain.id, 0);
  }

  for (const row of data) {
    const target = row.known_at ? knownByDomain : unknownByDomain;
    target.set(row.domain_id, (target.get(row.domain_id) ?? 0) + 1);
  }

  return activeDomains.map((domain) => ({
    id: domain.id,
    name: domain.name,
    knownCount: knownByDomain.get(domain.id) ?? 0,
    unknownCount: unknownByDomain.get(domain.id) ?? 0,
  }));
}
