import { escapeText } from "entities";
import type { CollectionStatBreakdown, StatsSnapshot } from "@/lib/jargon/collection-stats";
import type { TermCard, TermCardRelationship } from "@/lib/jargon/term-card";
import type { InlineKeyboardMarkup } from "./actions";

const TELEGRAM_MESSAGE_LIMIT = 4096;

function buildGoogleSearchUrl(term: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${term} definition`)}`;
}

function getAppBaseUrl(): string {
  return (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
}

function formatInlineSection(emoji: string, label: string, body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  return `\n\n${emoji} <b>${escapeText(label)}:</b> ${escapeText(trimmed)}`;
}

function formatRelationships(relationships: TermCardRelationship[]): string {
  if (relationships.length === 0) return "";

  let section = "";
  for (const relationship of relationships) {
    const type = escapeText(relationship.relationshipType);
    const name = escapeText(relationship.relatedTermName);
    section += `\n\n• ${type} <b>${name}</b>`;
    if (relationship.description?.trim()) {
      section += `\n  ${escapeText(relationship.description.trim())}`;
    }
  }
  return `\n${section}`;
}

function buildTermHeader(term: TermCard): string {
  return (
    `<b>${escapeText(term.term)}</b>\n` +
    `${escapeText(term.domainName)} · ${escapeText(term.category)}`
  );
}

function buildTermDetails(term: TermCard): string {
  let details = escapeText((term.definition ?? "").trim());
  details += formatInlineSection("💡", "Mental model", term.mentalModel ?? "");
  details += formatInlineSection("📌", "Example", term.example ?? "");
  details += formatInlineSection("⚠️", "Anti-example", term.antiExample ?? "");
  details += formatInlineSection("🛠", "In practice", term.discussion ?? "");
  details += formatInlineSection("⚡", "Debated", term.controversy ?? "");
  details += formatRelationships(term.relationships ?? []);
  return details;
}

function buildTermMessageBody(term: TermCard): string {
  return `${buildTermHeader(term)}\n\n${buildTermDetails(term)}`;
}

function appendSearchLink(message: string, termName: string): string {
  const searchUrl = buildGoogleSearchUrl(termName);
  return `${message}\n\n<a href="${searchUrl}">Search "${escapeText(termName)}" on Google</a>`;
}

function trimMessageBody(body: string, reservedLength: number): string {
  const maxBodyLength = TELEGRAM_MESSAGE_LIMIT - reservedLength;
  if (body.length <= maxBodyLength) return body;
  return `${body.slice(0, Math.max(0, maxBodyLength - 1)).trimEnd()}…`;
}

export function formatTermMessage(term: TermCard): string {
  const body = buildTermMessageBody(term);
  const searchLink = appendSearchLink("", term.term);
  const reservedLength = searchLink.length;

  const trimmed =
    body.length + reservedLength <= TELEGRAM_MESSAGE_LIMIT
      ? body
      : trimMessageBody(body, reservedLength);

  return appendSearchLink(trimmed, term.term);
}

function appendOpenInWebRow(rows: InlineKeyboardMarkup["inline_keyboard"], termId: string): void {
  const base = getAppBaseUrl();
  // Telegram already recorded this term as read when it delivered the message.
  const webUrl = `${base}/jargon/read?termId=${encodeURIComponent(termId)}&alreadyRead=true`;
  try {
    if (base && new URL(webUrl).protocol === "https:") {
      rows.push([{ text: "Open in web", url: webUrl }]);
    }
  } catch {
    // skip invalid APP_BASE_URL
  }
}

/** Masked prompt: term/domain/category only, gating the definition behind a
 *  reveal tap so the read only counts once the user actually looks. */
export function formatReadPrompt(term: TermCard): string {
  return `${buildTermHeader(term)}\n\n<i>Tap Reveal to see the definition.</i>`;
}

export function buildReadRevealKeyboard(termId: string): InlineKeyboardMarkup {
  return { inline_keyboard: [[{ text: "Reveal", callback_data: `read:reveal:${termId}` }]] };
}

export function buildTermInlineKeyboard(term: TermCard): InlineKeyboardMarkup {
  const rows: InlineKeyboardMarkup["inline_keyboard"] = [
    [{ text: "Read next", callback_data: `read:${term.id}` }],
  ];
  appendOpenInWebRow(rows, term.id);
  return { inline_keyboard: rows };
}

function formatProgressBar(percentage: number, width: number = 10): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function formatCollectionProgressLine(collection: CollectionStatBreakdown): string {
  const bar = formatProgressBar(collection.percentage);
  return `${bar} ${collection.knownCount}/${collection.totalCount} known (${collection.percentage}%)`;
}

function formatUnknownFootnote(collection: CollectionStatBreakdown): string {
  return `${collection.unknownCount} unknown`;
}

/** Renders `<label> <count> never studied`, or `<label> none waiting` when
 *  the count is zero. */
function formatRollupLine(label: string, unseen: number): string {
  if (unseen === 0) return `${label} none waiting`;
  return `${label} ${unseen} never studied`;
}

export function formatStatsMessage(stats: StatsSnapshot): string {
  if (stats.activeCount === 0 && stats.pausedCount === 0) {
    return "You don't have any collections yet. Create or add one in the app to get started.";
  }

  let message = `<b>📊 Your collections</b>\n\n`;
  message += `${stats.activeCount} active · ${stats.pausedCount} paused`;

  if (stats.activeCollections.length > 0) {
    message += `\n\n${formatRollupLine("Read", stats.rollup.read.unseen)}`;
    message += `\n${formatRollupLine("Review", stats.rollup.review.unseen)}`;
    message += `\n${formatRollupLine("Quiz", stats.rollup.quiz.unseen)}`;

    for (const collection of stats.activeCollections) {
      message += `\n\n<b>${escapeText(collection.name)}</b>\n`;
      message += `${formatCollectionProgressLine(collection)}\n`;
      message += formatUnknownFootnote(collection);
    }
  } else if (stats.pausedCount > 0) {
    message += `\n\n<i>All collections are paused. Turn one on in the app to start reviewing.</i>`;
  }

  return message;
}

function buildSetupCollectionKeyboard(
  prefix: string,
  collections: Array<{ id: string; name: string; count: number }>,
  allCount: number,
): InlineKeyboardMarkup {
  const rows: InlineKeyboardMarkup["inline_keyboard"] = [
    [{ text: `All collections (${allCount})`, callback_data: `${prefix}:domain:all` }],
  ];

  for (let i = 0; i < collections.length; i += 2) {
    const row: InlineKeyboardMarkup["inline_keyboard"][number] = [
      {
        text: `${collections[i].name} (${collections[i].count})`,
        callback_data: `${prefix}:domain:${collections[i].id}`,
      },
    ];
    if (i + 1 < collections.length) {
      row.push({
        text: `${collections[i + 1].name} (${collections[i + 1].count})`,
        callback_data: `${prefix}:domain:${collections[i + 1].id}`,
      });
    }
    rows.push(row);
  }

  return { inline_keyboard: rows };
}

function buildSetupCountKeyboard(prefix: string, maxCount: number): InlineKeyboardMarkup {
  const presets = [5, 10, 15, 20, 30].filter((value) => value <= maxCount);
  const uniquePresets = [...new Set(presets)];
  const rows: InlineKeyboardMarkup["inline_keyboard"] = [];

  for (let i = 0; i < uniquePresets.length; i += 3) {
    rows.push(
      uniquePresets.slice(i, i + 3).map((value) => ({
        text: String(value),
        callback_data: `${prefix}:count:${value}`,
      })),
    );
  }

  if (maxCount > 0) {
    rows.push([{ text: `All (${maxCount})`, callback_data: `${prefix}:count:all` }]);
  }

  return { inline_keyboard: rows };
}

export function buildQuizCollectionKeyboard(
  collections: Array<{ id: string; name: string; count: number }>,
  allCount: number,
): InlineKeyboardMarkup {
  return buildSetupCollectionKeyboard("quizsetup", collections, allCount);
}

export function buildQuizCountKeyboard(maxCount: number): InlineKeyboardMarkup {
  return buildSetupCountKeyboard("quizsetup", maxCount);
}

export function buildReviewSetupCollectionKeyboard(
  collections: Array<{ id: string; name: string; count: number }>,
  allCount: number,
): InlineKeyboardMarkup {
  return buildSetupCollectionKeyboard("reviewsetup", collections, allCount);
}

export function buildReviewSetupCountKeyboard(maxCount: number): InlineKeyboardMarkup {
  return buildSetupCountKeyboard("reviewsetup", maxCount);
}

export function formatQuizSetupCollectionPrompt(): string {
  return "<b>Which collection?</b>\n\nNumbers show available terms for your selection.";
}

export function formatQuizSetupCountPrompt(maxCount: number, defaultCount: number): string {
  return (
    `<b>How many questions?</b>\n\n` +
    `Reply with a number from 1 to ${maxCount}, tap a button, or send nothing for ${defaultCount}.`
  );
}

export function formatSetupPromptWithAnswer(prompt: string, choice: string): string {
  return `${prompt}\n\n<b>Your choice:</b> ${escapeText(choice)}`;
}

export function formatReviewSetupCollectionPrompt(): string {
  return "<b>Which collection?</b>\n\nNumbers show available terms for your selection.";
}

export function formatReviewSetupCountPrompt(maxCount: number, defaultCount: number): string {
  return (
    `<b>How many cards?</b>\n\n` +
    `Reply with a number from 1 to ${maxCount}, tap a button, or send nothing for ${defaultCount}.`
  );
}

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

/** Revealed card + the recorded rating, shown briefly before advancing.
 *  Wording is neutral regardless of which pool the term came from, since a
 *  mixed session blends known and unknown terms — the flip direction still
 *  applies correctly under the hood via that term's own origin status. */
export function formatReviewRated(
  term: TermCard,
  currentIndex: number,
  totalTerms: number,
  known: boolean,
): string {
  const message = formatReviewRevealed(term, currentIndex, totalTerms);
  const label = known ? "Got it" : "Missed it";
  const icon = known ? "✅" : "❌";
  return `${message}\n\n<b>Your answer:</b> ${icon} ${label}`;
}

export function buildReviewRevealKeyboard(sessionIndex: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: "Reveal", callback_data: `review:reveal:${sessionIndex}` }]],
  };
}

export function buildReviewRateKeyboard(sessionIndex: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "Got it", callback_data: `review:rate:${sessionIndex}:yes` },
        { text: "Missed it", callback_data: `review:rate:${sessionIndex}:no` },
      ],
    ],
  };
}

export function formatReviewSessionSummary(total: number, positiveCount: number): string {
  const negativeCount = total - positiveCount;
  const percentage = total > 0 ? Math.round((positiveCount / total) * 100) : 0;

  let message = `📊 <b>Review complete</b>\n\n`;
  message += `Cards reviewed: ${total}\n`;
  message += `Got it: ${positiveCount}\n`;
  message += `Missed it: ${negativeCount}\n\n`;

  if (percentage === 100) message += "🎉 You got every one — great work!";
  else if (percentage >= 80) message += "🌟 Great recall on these terms!";
  else if (percentage >= 60) message += "👍 Good effort — keep practicing!";
  else message += "💪 Worth another pass on these.";

  return message;
}

export function formatReviewQuestion(
  term: TermCard,
  currentIndex: number,
  totalQuestions: number,
): string {
  let message = `<b>Question ${currentIndex + 1}/${totalQuestions}</b>\n\n`;
  message += `${escapeText(term.definition)}\n\n`;
  message += `<i>Category: ${escapeText(term.category)}</i> · ${escapeText(term.domainName)}`;
  return message;
}

export function formatReviewQuestionWithAnswer(
  term: TermCard,
  questionIndex: number,
  totalQuestions: number,
  selectedTerm: string,
  isCorrect: boolean,
  currentScore: number,
  markedUnknown = false,
): string {
  let message = formatReviewQuestion(term, questionIndex, totalQuestions);
  message += `\n\n<b>Your answer:</b> ${escapeText(selectedTerm)}`;

  if (isCorrect) {
    message += `\n\n✅ <b>Correct!</b>`;
  } else {
    message += `\n\n❌ <b>Wrong.</b> The correct answer was: <b>${escapeText(term.term)}</b>`;
    if (markedUnknown) message += "\n<i>Marked as unknown.</i>";
  }

  message += `\n\nScore: ${currentScore}/${totalQuestions}`;
  return message;
}

export function formatTrueFalseQuestion(
  term: TermCard,
  currentIndex: number,
  totalQuestions: number,
  scenarioText: string,
): string {
  let message = `<b>Question ${currentIndex + 1}/${totalQuestions}</b>\n\n`;
  message += `Does this illustrate "${escapeText(term.term)}"?\n\n`;
  message += `<blockquote>${escapeText(scenarioText)}</blockquote>`;
  return message;
}

export function formatTrueFalseQuestionWithAnswer(
  term: TermCard,
  questionIndex: number,
  totalQuestions: number,
  scenarioText: string,
  selectedAnswer: boolean,
  correctAnswer: boolean,
  isCorrect: boolean,
  currentScore: number,
  markedUnknown = false,
): string {
  let message = formatTrueFalseQuestion(term, questionIndex, totalQuestions, scenarioText);
  message += `\n\n<b>Your answer:</b> ${selectedAnswer ? "True" : "False"}`;

  if (isCorrect) {
    message += `\n\n✅ <b>Correct!</b>`;
  } else {
    message += `\n\n❌ <b>Wrong.</b> The correct answer was: <b>${correctAnswer ? "True" : "False"}</b>`;
    if (markedUnknown) message += "\n<i>Marked as unknown.</i>";
  }

  message += `\n\nScore: ${currentScore}/${totalQuestions}`;
  return message;
}

export function buildTrueFalseKeyboard(sessionIndex: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "True", callback_data: `quiztf:${sessionIndex}:true` },
        { text: "False", callback_data: `quiztf:${sessionIndex}:false` },
      ],
    ],
  };
}

export function buildReviewKeyboard(
  options: Array<{ id: string; term: string }>,
  sessionIndex: number,
): InlineKeyboardMarkup {
  const rows: InlineKeyboardMarkup["inline_keyboard"] = [];

  for (let i = 0; i < options.length; i += 2) {
    const row: InlineKeyboardMarkup["inline_keyboard"][number] = [
      {
        text: options[i].term,
        callback_data: `quiz:${sessionIndex}:${options[i].id}`,
      },
    ];
    if (i + 1 < options.length) {
      row.push({
        text: options[i + 1].term,
        callback_data: `quiz:${sessionIndex}:${options[i + 1].id}`,
      });
    }
    rows.push(row);
  }

  return { inline_keyboard: rows };
}

export function formatReviewSummary(score: number, total: number): string {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  let message = `📊 <b>Quiz Complete!</b>\n\n`;
  message += `Score: ${score}/${total} (${percentage}%)\n\n`;

  if (percentage === 100) message += "🎉 Perfect score! Excellent work!";
  else if (percentage >= 80) message += "🌟 Great job! You know these terms well!";
  else if (percentage >= 60) message += "👍 Good effort! Keep practicing!";
  else message += "💪 Keep studying! You'll improve with practice!";

  return message;
}
