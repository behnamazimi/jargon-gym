import { escapeText } from "entities";
import type { TermCard } from "@/lib/jargon/term-card";
import { AGAIN, EASY, GOOD, HARD, type ReviewGrade } from "@/lib/trace";
import type { InlineKeyboardMarkup } from "./actions";
import { buildTermDetails } from "./presentation-term";

function buildReviewCardHeader(term: TermCard, currentIndex: number, totalTerms: number): string {
  let message = `<b>Review ${currentIndex + 1}/${totalTerms}</b>\n\n`;
  message += `<b>${escapeText(term.term)}</b>\n`;
  message += `<i>${escapeText(term.category)}</i> · ${escapeText(term.domainName)}`;
  return message;
}

/** Masked card: term/category/collection only, hinting the user to recall before revealing. */
export function formatReviewPrompt(
  term: TermCard,
  currentIndex: number,
  totalTerms: number,
): string {
  const header = buildReviewCardHeader(term, currentIndex, totalTerms);
  return `${header}\n\n<i>Try to recall it before revealing.</i>`;
}

/** Revealed card: full term content appended in place of the recall hint. */
export function formatReviewRevealed(
  term: TermCard,
  currentIndex: number,
  totalTerms: number,
): string {
  const header = buildReviewCardHeader(term, currentIndex, totalTerms);
  return `${header}\n\n${buildTermDetails(term)}`;
}

/** Same four FSRS-5 grades the web Review page's buttons record — see
 *  lib/trace's ReviewGrade. Telegram's keyboard used to offer only a
 *  binary Got it / Missed it choice mapped onto Good/Again; this is the
 *  real thing. */
const REVIEW_GRADE_LABELS: Record<ReviewGrade, string> = {
  [AGAIN]: "Again",
  [HARD]: "Hard",
  [GOOD]: "Good",
  [EASY]: "Easy",
};

/** Revealed card + the recorded grade, shown briefly before advancing. */
export function formatReviewRated(
  term: TermCard,
  currentIndex: number,
  totalTerms: number,
  grade: ReviewGrade,
): string {
  const message = formatReviewRevealed(term, currentIndex, totalTerms);
  const icon = grade >= GOOD ? "✅" : "❌";
  return `${message}\n\n<b>Your answer:</b> ${icon} ${REVIEW_GRADE_LABELS[grade]}`;
}

export function buildReviewRevealKeyboard(sessionIndex: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: "Reveal", callback_data: `review:reveal:${sessionIndex}` }]],
  };
}

export function buildReviewRateKeyboard(
  sessionIndex: number,
  isNewToUser?: boolean,
): InlineKeyboardMarkup {
  const button = (grade: ReviewGrade) => ({
    text: REVIEW_GRADE_LABELS[grade],
    callback_data: `review:rate:${sessionIndex}:${grade}`,
  });
  const rows: InlineKeyboardMarkup["inline_keyboard"] = [
    [button(AGAIN), button(HARD)],
    [button(GOOD), button(EASY)],
  ];
  if (isNewToUser) {
    rows.push([{ text: "I already know this", callback_data: `review:known:${sessionIndex}` }]);
  }
  return {
    inline_keyboard: rows,
  };
}

/** `retainedCount` mirrors the web summary's definition: grades of Good or
 *  Easy count as retained, Again/Hard as missed (lib/trace's ReviewGrade,
 *  GOOD threshold). */
export function formatReviewSessionSummary(total: number, retainedCount: number): string {
  const negativeCount = total - retainedCount;
  const percentage = total > 0 ? Math.round((retainedCount / total) * 100) : 0;

  let message = `📊 <b>Review complete</b>\n\n`;
  message += `Cards reviewed: ${total}\n`;
  message += `Got it: ${retainedCount}\n`;
  message += `Missed it: ${negativeCount}\n\n`;

  if (percentage === 100) message += "🎉 You got every one — great work!";
  else if (percentage >= 80) message += "🌟 Great recall on these terms!";
  else if (percentage >= 60) message += "👍 Good effort — keep practicing!";
  else message += "💪 Worth another pass on these.";

  return message;
}
