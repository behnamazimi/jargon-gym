import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { QuizTerm } from "./types";

type Client = SupabaseClient<Database>;

/**
 * Select distractor terms for a quiz question.
 * Prioritizes related terms first, then fills with random terms from the same domain.
 */
export async function selectDistractors(
  client: Client,
  termId: string,
  allTermsInPool: QuizTerm[],
  count: number = 3,
): Promise<QuizTerm[]> {
  const distractors: QuizTerm[] = [];
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

  if (!relatedError && relatedTerms && relatedTerms.length > 0) {
    const relatedIds = relatedTerms.map((rel) => {
      return rel.source_term_id === termId ? rel.target_term_id : rel.source_term_id;
    });

    for (const relatedId of relatedIds) {
      const relatedTerm = allTermsInPool.find((t) => t.id === relatedId);
      if (relatedTerm && !excludedIds.includes(relatedTerm.id)) {
        distractors.push(relatedTerm);
        excludedIds.push(relatedTerm.id);

        if (distractors.length >= count) {
          break;
        }
      }
    }
  }

  if (distractors.length < count) {
    const needed = count - distractors.length;
    const currentDomainName = allTermsInPool.find((x) => x.id === termId)?.domainName;

    const sameDomainTerms = allTermsInPool.filter(
      (t) => !excludedIds.includes(t.id) && t.domainName === currentDomainName,
    );

    const shuffled = sameDomainTerms.sort(() => Math.random() - 0.5);
    distractors.push(...shuffled.slice(0, needed));
  }

  return distractors.sort(() => Math.random() - 0.5);
}

/**
 * Domain-scoped distractors (Telegram quiz): related terms first, then random same-domain.
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
