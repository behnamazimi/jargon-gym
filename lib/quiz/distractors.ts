import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

type TermRef = { id: string; term: string };

async function fetchRelatedDistractors(
  client: Client,
  termId: string,
  excludedIds: string[],
  count: number,
): Promise<TermRef[]> {
  const { data: relatedTerms, error: relatedError } = await client
    .from("term_relationships")
    .select(
      `
      source_term_id,
      target_term_id,
      source:terms!term_relationships_source_term_id_fkey(id, term),
      target:terms!term_relationships_target_term_id_fkey(id, term)
    `,
    )
    .or(`source_term_id.eq.${termId},target_term_id.eq.${termId}`);

  if (relatedError || !relatedTerms) return [];

  const distractors: TermRef[] = [];
  for (const rel of relatedTerms) {
    const relatedTerm =
      rel.source_term_id === termId
        ? (rel.target as unknown as TermRef)
        : (rel.source as unknown as TermRef);

    if (!relatedTerm || excludedIds.includes(relatedTerm.id)) continue;

    distractors.push(relatedTerm);
    excludedIds.push(relatedTerm.id);
    if (distractors.length >= count) break;
  }
  return distractors;
}

async function fetchRandomDistractors(
  client: Client,
  domainId: string,
  excludedIds: string[],
  needed: number,
): Promise<TermRef[]> {
  const { data: randomTerms, error: randomError } = await client
    .from("terms")
    .select("id, term")
    .eq("domain_id", domainId)
    .not("id", "in", `(${excludedIds.join(",")})`)
    .limit(needed * 3);

  if (randomError || !randomTerms) return [];

  const shuffled = randomTerms.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, needed).map((t) => ({ id: t.id, term: t.term }));
}

/**
 * Domain-scoped distractors: related terms first, then random same-domain.
 */
export async function selectDistractorsFromDomain(
  client: Client,
  termId: string,
  domainId: string,
  count: number = 3,
): Promise<Array<{ id: string; term: string }>> {
  const excludedIds = [termId];
  const distractors = await fetchRelatedDistractors(client, termId, excludedIds, count);

  if (distractors.length < count) {
    const needed = count - distractors.length;
    distractors.push(...(await fetchRandomDistractors(client, domainId, excludedIds, needed)));
  }

  return distractors.sort(() => Math.random() - 0.5);
}
