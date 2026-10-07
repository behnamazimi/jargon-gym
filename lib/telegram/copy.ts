export const CONNECT_MESSAGE =
  "Connect your Telegram account in Settings first, then tap the link to open this bot.";

export const WELCOME_MESSAGE =
  "You're connected to Lobyas. Use /read anytime for a term to read. Scheduled reminders follow your cadence setting in the app.";

export const HELP_MESSAGE =
  "Commands:\n/read: send the next term to read\n/review: flashcard-style review (guided setup)\n/quiz: start a quiz (guided setup)";

export const CAUGHT_UP_MESSAGE =
  "You're all caught up. Nothing new in your active collections. Add a collection, or turn one back on, in your Library in the app.";

export const READ_NEXT_FAILED_MESSAGE = "Couldn't load the next term. Try /read again in a moment.";

export const REVIEW_REVEAL_FAILED_SUFFIX = "\n\n<i>Couldn't reveal that term. Try again.</i>";

export const READ_REVEAL_FAILED_SUFFIX = "\n\n<i>Couldn't reveal that term. Try again.</i>";

export const QUIZ_HELP_MESSAGE =
  "Usage: /quiz [all|<collection>] [count|all]\n\n" +
  "Test yourself on terms from your active collections.\n\n" +
  "Examples:\n" +
  "/quiz: guided setup\n" +
  "/quiz all 10: 10 terms from all collections\n" +
  "/quiz all: choose how many terms";

export const NO_KNOWN_TERMS_FOR_QUIZ_MESSAGE =
  "No terms to quiz yet. Add some, or turn a collection back on, then try /quiz.";

export const NOTHING_ELIGIBLE_FOR_QUIZ_MESSAGE = "No terms in this collection yet.";

export const REVIEW_HELP_MESSAGE =
  "Usage: /review [all|<collection>] [count|all]\n\n" +
  "Practice recall with flashcards from your active collections.\n\n" +
  "Examples:\n" +
  "/review: guided setup\n" +
  "/review all 10: 10 cards from all collections\n" +
  "/review all: choose how many cards";

export const NO_REVIEW_TERMS_MESSAGE =
  "You have no terms to review. Add a collection, or turn one back on, in your Library in the app.";
