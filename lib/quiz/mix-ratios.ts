/**
 * Shared question-type mix ratios for both quiz generation paths
 * (generate.ts's AI prompt and generate-simple.ts's deterministic builder).
 * Keeping these in one place stops the two paths from drifting apart.
 */

/** Max share of the quiz that can be example-judgment true/false questions. */
export const EXAMPLE_JUDGMENT_MAX_SHARE = 0.5;

/** Of the terms left after example-judgment, the share that become multiple_choice (the rest become plain true/false). */
export const MCQ_SHARE_OF_REMAINDER = 0.6;
