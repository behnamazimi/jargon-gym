import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { DistractorSource, DistractorTerm, PickDistractorsOptions } from "./distractors";
import { shuffle } from "./random";
import type { QuizTerm } from "./types";

type Client = SupabaseClient<Database>;

type RelatedTermRow = {
  id: string;
  term: string;
  definition: string | null;
  category: string | null;
};

const RANDOM_CANDIDATE_MIN = 60;

function toDistractor(row: RelatedTermRow): DistractorTerm | null {
  if (!row.definition) return null;
  return { id: row.id, term: row.term, definition: row.definition, category: row.category };
}

async function fetchRelatedDistractors(
  client: Client,
  termId: string,
  excludedIds: string[],
  count: number,
): Promise<DistractorTerm[]> {
  const { data: relatedTerms, error } = await client
    .from("term_relationships")
    .select(
      `
      source_term_id,
      target_term_id,
      source:terms!term_relationships_source_term_id_fkey(id, term, definition, category),
      target:terms!term_relationships_target_term_id_fkey(id, term, definition, category)
    `,
    )
    .or(`source_term_id.eq.${termId},target_term_id.eq.${termId}`);

  if (error || !relatedTerms) return [];

  const distractors: DistractorTerm[] = [];
  for (const rel of relatedTerms) {
    const related = (rel.source_term_id === termId
      ? rel.target
      : rel.source) as unknown as RelatedTermRow | null;
    const distractor = related ? toDistractor(related) : null;
    if (!distractor || excludedIds.includes(distractor.id)) continue;

    distractors.push(distractor);
    excludedIds.push(distractor.id);
    if (distractors.length >= count) break;
  }
  return distractors;
}

async function fetchRandomDistractors(
  client: Client,
  term: QuizTerm,
  excludedIds: string[],
  needed: number,
  { preferCategory }: PickDistractorsOptions,
): Promise<DistractorTerm[]> {
  const { data, error } = await client
    .from("terms")
    .select("id, term, definition, category")
    .eq("domain_id", term.domainId)
    .not("definition", "is", null)
    .not("id", "in", `(${excludedIds.join(",")})`)
    .limit(Math.max(needed * 3, RANDOM_CANDIDATE_MIN));

  if (error || !data) return [];

  const candidates = shuffle(
    data.map(toDistractor).filter((row): row is DistractorTerm => row !== null),
  );
  if (preferCategory && term.category) {
    const sameCategory = candidates.filter((row) => row.category === term.category);
    const others = candidates.filter((row) => row.category !== term.category);
    return [...sameCategory, ...others].slice(0, needed);
  }
  return candidates.slice(0, needed);
}

/** Related terms first, then others from the same collection. */
export function supabaseDistractorSource(client: Client): DistractorSource {
  return {
    async pick(term, count, options = {}) {
      const excludedIds = [term.id];
      const distractors = await fetchRelatedDistractors(client, term.id, excludedIds, count);

      if (distractors.length < count) {
        distractors.push(
          ...(await fetchRandomDistractors(
            client,
            term,
            excludedIds,
            count - distractors.length,
            options,
          )),
        );
      }

      return shuffle(distractors);
    },
  };
}
