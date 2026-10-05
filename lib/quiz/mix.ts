import type { PlannedTemplateId } from "./types";

/**
 * Hard ceiling on the share of an AI-generated quiz that can be true/false
 * questions (lib/quiz/generate.ts only). True/false is the easiest shape to
 * pass by guessing, so the rest (at least 60%) is multiple_choice.
 */
export const TRUE_FALSE_MAX_SHARE = 0.4;

/** Wrong options shown next to the right one in a choice question. */
export const DISTRACTOR_COUNT = 3;

/** Fewest wrong options a choice template accepts before the planner moves on
 *  to another template. The fallback template ignores this. */
export const MIN_DISTRACTORS = 2;

/** Relative chance that a planned template is tried first for a term. */
export const TEMPLATE_WEIGHTS: Record<PlannedTemplateId, number> = {
  // The baseline recognition question.
  definition_to_term: 3,
  // Reverses the direction so a learner can't lean on the label alone.
  term_to_meaning: 2,
  // Applies the term in context; the strongest recognition test we can build.
  masked_example: 3,
  // 50% guess rate, so it stays a small share of any quiz.
  does_it_fit: 1,
};
