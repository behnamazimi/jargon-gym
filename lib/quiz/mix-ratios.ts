/**
 * Shared question-type mix cap for every quiz surface (generate.ts's AI
 * prompt, generate-simple.ts's deterministic builder, and the Telegram bot's
 * quiz session in lib/telegram/session-store.ts). Keeping this in one place
 * stops the surfaces from drifting apart.
 */

/**
 * Hard ceiling on the share of a quiz that can be true/false questions of
 * either flavor — example-judgment ("Does this illustrate X?") plus plain
 * true/false — combined. True/false is the easiest question shape to pass by
 * guessing, so the rest (at least 60%) is multiple_choice.
 */
export const TRUE_FALSE_MAX_SHARE = 0.4;
