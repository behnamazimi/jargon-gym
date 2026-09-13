/**
 * Question-type mix cap for AI-mode quiz generation (lib/quiz/generate.ts)
 * only. Simple mode and the Telegram bot no longer generate true/false
 * questions, so they don't consume this budget.
 */

/**
 * Hard ceiling on the share of an AI-generated quiz that can be true/false
 * questions. True/false is the easiest question shape to pass by guessing,
 * so the rest (at least 60%) is multiple_choice.
 */
export const TRUE_FALSE_MAX_SHARE = 0.4;
