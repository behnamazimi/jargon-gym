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

  const { data: terms, error: termsError } = await client
    .from("terms")
    .select("id, domain_id")
    .in("domain_id", domainIds);

  if (termsError) throw termsError;

  const knownByDomain = new Map<string, number>();
  const unknownByDomain = new Map<string, number>();

  for (const domain of activeDomains) {
    knownByDomain.set(domain.id, 0);
    unknownByDomain.set(domain.id, 0);
  }

  const termToDomain = new Map<string, string>();
  for (const term of terms) {
    termToDomain.set(term.id, term.domain_id);
    unknownByDomain.set(term.domain_id, (unknownByDomain.get(term.domain_id) ?? 0) + 1);
  }

  if (terms.length > 0) {
    const { data: progress, error: progressError } = await client
      .from("user_progress")
      .select("term_id")
      .eq("user_id", userId)
      .in(
        "term_id",
        terms.map((term) => term.id),
      );

    if (progressError) throw progressError;

    for (const row of progress) {
      const domainId = termToDomain.get(row.term_id);
      if (!domainId) continue;
      knownByDomain.set(domainId, (knownByDomain.get(domainId) ?? 0) + 1);
      unknownByDomain.set(domainId, (unknownByDomain.get(domainId) ?? 0) - 1);
    }
  }

  return activeDomains.map((domain) => ({
    id: domain.id,
    name: domain.name,
    knownCount: knownByDomain.get(domain.id) ?? 0,
    unknownCount: unknownByDomain.get(domain.id) ?? 0,
  }));
}
