import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getReviewPoolStatsByDomainForUser } from "@/lib/smart-queue";

type Client = SupabaseClient<Database>;

export type CollectionStats = {
  id: string;
  name: string;
  isActive: boolean;
  knownCount: number;
  totalCount: number;
  percentage: number;
  unknownUnseen: number;
  unknownSeen: number;
  unknownStale: number;
};

export async function fetchCollectionStats(
  client: Client,
  userId: string,
): Promise<CollectionStats[]> {
  const { data: domainIds, error: domainError } = await client.rpc("review_domain_ids", {
    p_user_id: userId,
  });

  if (domainError) throw domainError;

  const ids = domainIds ?? [];
  if (ids.length === 0) return [];

  const { data: activeDomains, error: activeError } = await client
    .from("user_active_domains")
    .select("domain_id")
    .eq("user_id", userId);

  if (activeError) throw activeError;

  const activeSet = new Set((activeDomains ?? []).map((d) => d.domain_id));

  const { data: domains, error: domainsError } = await client
    .from("domains")
    .select("id, name")
    .in("id", ids);

  if (domainsError) throw domainsError;

  const { data: termCounts, error: termsError } = await client
    .from("terms")
    .select("domain_id")
    .in("domain_id", ids);

  if (termsError) throw termsError;

  const { data: knownTerms, error: knownError } = await client
    .from("user_progress")
    .select("term_id, terms!inner(domain_id)")
    .eq("user_id", userId)
    .in("terms.domain_id", ids);

  if (knownError) throw knownError;

  const termCountMap = new Map<string, number>();
  for (const term of termCounts ?? []) {
    termCountMap.set(term.domain_id, (termCountMap.get(term.domain_id) ?? 0) + 1);
  }

  const knownCountMap = new Map<string, number>();
  for (const row of knownTerms ?? []) {
    const domainId = (row.terms as unknown as { domain_id: string }).domain_id;
    knownCountMap.set(domainId, (knownCountMap.get(domainId) ?? 0) + 1);
  }

  const unknownStatsByDomain = await getReviewPoolStatsByDomainForUser(client, userId, "unknown");

  const stats: CollectionStats[] = (domains ?? []).map((domain) => {
    const totalCount = termCountMap.get(domain.id) ?? 0;
    const knownCount = knownCountMap.get(domain.id) ?? 0;
    const percentage = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
    const queueStats = unknownStatsByDomain.get(domain.id);

    return {
      id: domain.id,
      name: domain.name,
      isActive: activeSet.has(domain.id),
      knownCount,
      totalCount,
      percentage,
      unknownUnseen: queueStats?.unseen ?? 0,
      unknownSeen: queueStats?.seen ?? 0,
      unknownStale: queueStats?.stale ?? 0,
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
