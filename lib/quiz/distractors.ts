import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/**
 * Domain-scoped distractors: related terms first, then random same-domain.
 */
export async function selectDistractorsFromDomain(
  client: Client,
  termId: string,
  domainId: string,
  count: number = 3,
): Promise<Array<{ id: string; term: string }>> {
  const distractors: Array<{ id: string; term: string }> = [];
  const excludedIds = [termId];

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

  if (!relatedError && relatedTerms) {
    for (const rel of relatedTerms) {
      const relatedTerm =
        rel.source_term_id === termId
          ? (rel.target as unknown as { id: string; term: string })
          : (rel.source as unknown as { id: string; term: string });

      if (relatedTerm && !excludedIds.includes(relatedTerm.id)) {
        distractors.push({ id: relatedTerm.id, term: relatedTerm.term });
        excludedIds.push(relatedTerm.id);
        if (distractors.length >= count) break;
      }
    }
  }

  if (distractors.length < count) {
    const needed = count - distractors.length;
    const { data: randomTerms, error: randomError } = await client
      .from("terms")
      .select("id, term")
      .eq("domain_id", domainId)
      .not("id", "in", `(${excludedIds.join(",")})`)
      .limit(needed * 3);

    if (!randomError && randomTerms) {
      const shuffled = randomTerms.sort(() => Math.random() - 0.5);
      distractors.push(...shuffled.slice(0, needed).map((t) => ({ id: t.id, term: t.term })));
    }
  }

  return distractors.sort(() => Math.random() - 0.5);
}
