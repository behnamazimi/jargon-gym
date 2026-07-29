import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Selects distractor terms for a review question.
 * Prioritizes related terms first, then fills with random terms from the same domain.
 */
export async function selectDistractors(
  supabase: SupabaseClient,
  termId: string,
  domainId: string,
  count: number = 3,
): Promise<Array<{ id: string; term: string }>> {
  const distractors: Array<{ id: string; term: string }> = [];
  const excludedIds = [termId];

  // Step 1: Get related terms (both incoming and outgoing relationships)
  const { data: relatedTerms, error: relatedError } = await supabase
    .from("term_relationships")
    .select(`
      source_term_id,
      target_term_id,
      source:terms!term_relationships_source_term_id_fkey(id, term),
      target:terms!term_relationships_target_term_id_fkey(id, term)
    `)
    .or(`source_term_id.eq.${termId},target_term_id.eq.${termId}`);

  if (relatedError) {
    console.error("Error fetching related terms:", relatedError);
  } else if (relatedTerms && relatedTerms.length > 0) {
    // Extract the related term (the one that's NOT the current term)
    for (const rel of relatedTerms) {
      const relatedTerm =
        rel.source_term_id === termId
          ? (rel.target as unknown as { id: string; term: string })
          : (rel.source as unknown as { id: string; term: string });

      if (relatedTerm && !excludedIds.includes(relatedTerm.id)) {
        distractors.push({ id: relatedTerm.id, term: relatedTerm.term });
        excludedIds.push(relatedTerm.id);

        if (distractors.length >= count) {
          break;
        }
      }
    }
  }

  // Step 2: If we need more distractors, get random terms from the same domain
  if (distractors.length < count) {
    const needed = count - distractors.length;

    const { data: randomTerms, error: randomError } = await supabase
      .from("terms")
      .select("id, term")
      .eq("domain_id", domainId)
      .not("id", "in", `(${excludedIds.join(",")})`)
      .limit(needed * 3); // Get more than needed to allow for shuffling

    if (randomError) {
      console.error("Error fetching random terms:", randomError);
    } else if (randomTerms && randomTerms.length > 0) {
      // Shuffle and take what we need
      const shuffled = randomTerms.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, needed);

      distractors.push(...selected.map((t) => ({ id: t.id, term: t.term })));
    }
  }

  // Shuffle the final list of distractors
  return distractors.sort(() => Math.random() - 0.5);
}
