import { createClient } from "@/lib/supabase/server";
import type { QuizQuestion, QuizTerm } from "./types";

/**
 * Select distractor terms for a quiz question
 * Prioritizes related terms first, then fills with random terms from the same domain
 */
async function selectDistractors(
  termId: string,
  domainId: string,
  allTermsInPool: QuizTerm[],
  count: number = 3,
): Promise<QuizTerm[]> {
  const supabase = await createClient();
  const distractors: QuizTerm[] = [];
  const excludedIds = [termId];

  // Step 1: Get related terms
  const { data: relatedTerms, error: relatedError } = await supabase
    .from("term_relationships")
    .select(`
      source_term_id,
      target_term_id,
      source:terms!term_relationships_source_term_id_fkey(id, term),
      target:terms!term_relationships_target_term_id_fkey(id, term)
    `)
    .or(`source_term_id.eq.${termId},target_term_id.eq.${termId}`);

  if (!relatedError && relatedTerms && relatedTerms.length > 0) {
    // Extract the related term IDs (the one that's NOT the current term)
    const relatedIds = relatedTerms.map((rel) => {
      return rel.source_term_id === termId ? rel.target_term_id : rel.source_term_id;
    });

    // Find these terms in our pool
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

  // Step 2: If we need more distractors, get random terms from the same domain
  if (distractors.length < count) {
    const needed = count - distractors.length;

    // Get random terms from the pool that are from the same domain
    const sameDomainTerms = allTermsInPool.filter(
      (t) =>
        !excludedIds.includes(t.id) &&
        t.domainName === allTermsInPool.find((x) => x.id === termId)?.domainName,
    );

    // Shuffle and take what we need
    const shuffled = sameDomainTerms.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, needed);

    distractors.push(...selected);
  }

  // Shuffle the final list
  return distractors.sort(() => Math.random() - 0.5);
}

/**
 * Generate a simple quiz without AI - uses exact definitions and term names
 * Each question shows the definition and asks user to pick the correct term
 */
export async function generateSimpleQuiz(terms: QuizTerm[]): Promise<QuizQuestion[]> {
  const questions: QuizQuestion[] = [];

  for (const term of terms) {
    // Get 3 distractor terms
    const distractors = await selectDistractors(
      term.id,
      term.id, // We'll need domain ID, but we can derive it
      terms,
      3,
    );

    // Build options: correct term + distractors
    const correctOption = { id: term.id, text: term.term };
    const distractorOptions = distractors.map((d) => ({ id: d.id, text: d.term }));

    const allOptions = [correctOption, ...distractorOptions];

    // Shuffle options so correct isn't always first
    const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);

    // Build the question
    const question: QuizQuestion = {
      type: "multiple_choice",
      termId: term.id,
      prompt: term.definition.trim(),
      options: shuffledOptions,
      correctOptionIds: [term.id],
    };

    questions.push(question);
  }

  return questions;
}
