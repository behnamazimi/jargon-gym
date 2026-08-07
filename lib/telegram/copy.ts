export const CONNECT_MESSAGE =
  "Connect your Telegram account in Jargon Gym settings first, then tap the link to open this bot.";

export const WELCOME_MESSAGE =
  "You're connected to Jargon Gym. Use /read anytime for a term to review. Scheduled reminders follow your cadence setting in the app.";

export const HELP_MESSAGE =
  "Commands:\n/read — send the next term to review\n/review — flashcard-style review (guided setup)\n/quiz — start a quiz (guided setup)\n/stat — show your collection statistics";

export const CAUGHT_UP_MESSAGE =
  "You're all caught up — no unknown terms left in your active review domains. Import more or turn domains back on in the app.";

export const MARKED_KNOWN_SUFFIX = "\n\n✓ Marked as known";

export const QUIZ_HELP_MESSAGE =
  "Usage: /quiz [known|unknown] [all|<collection>] [count|all]\n\n" +
  "Examples:\n" +
  "/quiz — guided setup\n" +
  "/quiz unknown — pick collection and count\n" +
  "/quiz known all 10 — 10 known terms from all collections\n" +
  "/quiz unknown all — choose how many unknown terms";

export const NO_UNKNOWN_TERMS_MESSAGE =
  "You have no unknown terms in your review pool. Try /quiz known to quiz yourself on terms you've already learned!";

export const NO_KNOWN_TERMS_MESSAGE =
  "You haven't marked any terms as known yet. Try /quiz unknown to start learning!";

export const REVIEW_HELP_MESSAGE =
  "Usage: /review [known|unknown] [all|<collection>] [count|all]\n\n" +
  "Examples:\n" +
  "/review — guided setup\n" +
  "/review unknown — pick collection and count\n" +
  "/review known all 10 — 10 known terms from all collections\n" +
  "/review unknown all — choose how many unknown terms";

export const NO_UNKNOWN_REVIEW_TERMS_MESSAGE =
  "You have no unknown terms in your review pool. Try /review known to review terms you've already learned!";

export const NO_KNOWN_REVIEW_TERMS_MESSAGE =
  "You haven't marked any terms as known yet. Try /review unknown to start learning!";
