import type { CollectionStats } from "@/lib/jargon/collection-stats";
import type { TermCard, TermCardRelationship } from "@/lib/jargon/term-card";
import { formatPickDebugLine, type PickMeta } from "@/lib/smart-queue";
import type { InlineKeyboardMarkup } from "./actions";

const TELEGRAM_MESSAGE_LIMIT = 4096;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildGoogleSearchUrl(term: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${term} definition`)}`;
}

function getAppBaseUrl(): string {
  return (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
}

function formatInlineSection(emoji: string, label: string, body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  return `\n\n${emoji} <b>${escapeHtml(label)}:</b> ${escapeHtml(trimmed)}`;
}

function formatRelationships(relationships: TermCardRelationship[]): string {
  if (relationships.length === 0) return "";

  let section = "";
  for (const relationship of relationships) {
    const type = escapeHtml(relationship.relationshipType);
    const name = escapeHtml(relationship.relatedTermName);
    section += `\n\n• ${type} <b>${name}</b>`;
    if (relationship.description?.trim()) {
      section += `\n  ${escapeHtml(relationship.description.trim())}`;
    }
  }
  return `\n${section}`;
}

function buildTermHeader(term: TermCard): string {
  return (
    `<b>${escapeHtml(term.term)}</b>\n` +
    `${escapeHtml(term.domainName)} · ${escapeHtml(term.category)}`
  );
}

function buildTermDetails(term: TermCard): string {
  let details = escapeHtml((term.definition ?? "").trim());
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
  return `${message}\n\n<a href="${searchUrl}">Search "${escapeHtml(termName)}" on Google</a>`;
}

function formatPickDebugFooter(pickMeta: PickMeta): string {
  return `\n\n<i>${escapeHtml(formatPickDebugLine(pickMeta.score, pickMeta.reasons, "read"))}</i>`;
}

function trimMessageBody(body: string, reservedLength: number): string {
  const maxBodyLength = TELEGRAM_MESSAGE_LIMIT - reservedLength;
  if (body.length <= maxBodyLength) return body;
  return `${body.slice(0, Math.max(0, maxBodyLength - 1)).trimEnd()}…`;
}

export function formatTermMessage(term: TermCard, pickMeta?: PickMeta): string {
  const body = buildTermMessageBody(term);
  const searchLink = appendSearchLink("", term.term);
  const debugFooter = pickMeta ? formatPickDebugFooter(pickMeta) : "";
  const reservedLength = searchLink.length + debugFooter.length;

  const trimmed =
    body.length + reservedLength <= TELEGRAM_MESSAGE_LIMIT
      ? body
      : trimMessageBody(body, reservedLength);

  return `${appendSearchLink(trimmed, term.term)}${debugFooter}`;
}

export function formatMaskedTermMessage(term: TermCard): string {
  const header = buildTermHeader(term);
  const details = buildTermDetails(term);
  const searchLink = appendSearchLink("", term.term);
  const spoilerOverhead = "<tg-spoiler></tg-spoiler>".length;
  const reservedLength = header.length + "\n\n".length + spoilerOverhead + searchLink.length;
  const trimmedDetails =
    details.length + reservedLength <= TELEGRAM_MESSAGE_LIMIT
      ? details
      : trimMessageBody(details, reservedLength);
  return `${header}\n\n<tg-spoiler>${trimmedDetails}${searchLink}</tg-spoiler>`;
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

export function buildTermInlineKeyboard(term: TermCard): InlineKeyboardMarkup {
  const rows: InlineKeyboardMarkup["inline_keyboard"] = [
    [{ text: "Read next", callback_data: `read:${term.id}` }],
  ];
  appendOpenInWebRow(rows, term.id);
  return { inline_keyboard: rows };
}

export function buildReadKeyboard(termId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: "Read next", callback_data: `read:${termId}` }]],
  };
}

function formatProgressBar(percentage: number, width: number = 10): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function formatCollectionProgressLine(collection: CollectionStats): string {
  const bar = formatProgressBar(collection.percentage);
  return `${bar} ${collection.knownCount}/${collection.totalCount} known (${collection.percentage}%)`;
}

export function formatStatsMessage(stats: CollectionStats[]): string {
  if (stats.length === 0) {
    return "You don't have any collections yet. Create or add one in the app to get started.";
  }

  const activeCollections = stats.filter((s) => s.isActive);
  const pausedCollections = stats.filter((s) => !s.isActive);

  let message = `<b>📊 Your collections</b>\n\n`;
  message += `${activeCollections.length} active · ${pausedCollections.length} paused`;

  if (activeCollections.length > 0) {
    message += `\n\n<b>Active:</b>`;
    for (const collection of activeCollections) {
      message += `\n\n<b>${escapeHtml(collection.name)}</b>\n`;
      message += `${formatCollectionProgressLine(collection)}\n`;
      message += `Queue: ${collection.unknownUnseen} never read · ${collection.unknownSeen} read · ${collection.unknownStale} stale`;
    }
  } else if (pausedCollections.length > 0) {
    message += `\n\n<i>All collections are paused. Turn one on in the app to start reviewing.</i>`;
  }

  return message;
}

/** Shared status/collection/count wizard keyboards for /quiz and /review, keyed by callback prefix. */
function buildSetupStatusKeyboard(prefix: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "Unknown terms", callback_data: `${prefix}:status:unknown` },
        { text: "Known terms", callback_data: `${prefix}:status:known` },
      ],
    ],
  };
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

export function buildQuizStatusKeyboard(): InlineKeyboardMarkup {
  return buildSetupStatusKeyboard("quizsetup");
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

export function buildReviewSetupStatusKeyboard(): InlineKeyboardMarkup {
  return buildSetupStatusKeyboard("reviewsetup");
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

export function formatQuizSetupStatusPrompt(): string {
  return "<b>What to quiz?</b>\n\nChoose unknown terms you're learning, or known terms to review.";
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
  return `${prompt}\n\n<b>Your choice:</b> ${escapeHtml(choice)}`;
}

export function formatReviewSetupStatusPrompt(): string {
  return "<b>What to review?</b>\n\nChoose unknown terms you're learning, or known terms to refresh.";
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
  message += `<b>${escapeHtml(term.term)}</b>\n`;
  message += `<i>${escapeHtml(term.category)}</i> · ${escapeHtml(term.domainName)}`;
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

/** Revealed card + the recorded rating, shown briefly before advancing. */
export function formatReviewRated(
  term: TermCard,
  currentIndex: number,
  totalTerms: number,
  status: "known" | "unknown",
  known: boolean,
): string {
  const message = formatReviewRevealed(term, currentIndex, totalTerms);
  const label = known
    ? status === "known"
      ? "Still know it"
      : "Had it"
    : status === "known"
      ? "Forgot it"
      : "Didn't have it";
  const icon = known ? "✅" : "❌";
  return `${message}\n\n<b>Your answer:</b> ${icon} ${label}`;
}

export function buildReviewRevealKeyboard(sessionIndex: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: "Reveal", callback_data: `review:reveal:${sessionIndex}` }]],
  };
}

export function buildReviewRateKeyboard(
  sessionIndex: number,
  status: "known" | "unknown",
): InlineKeyboardMarkup {
  const [yesLabel, noLabel] =
    status === "known" ? ["Still know it", "Forgot it"] : ["Had it", "Didn't have it"];
  return {
    inline_keyboard: [
      [
        { text: yesLabel, callback_data: `review:rate:${sessionIndex}:yes` },
        { text: noLabel, callback_data: `review:rate:${sessionIndex}:no` },
      ],
    ],
  };
}

export function formatReviewSessionSummary(
  status: "known" | "unknown",
  total: number,
  positiveCount: number,
): string {
  const negativeCount = total - positiveCount;
  const positiveLabel = status === "known" ? "Still know it" : "Had it";
  const negativeLabel = status === "known" ? "Forgot it" : "Didn't have it";
  const percentage = total > 0 ? Math.round((positiveCount / total) * 100) : 0;

  let message = `📊 <b>Review complete</b>\n\n`;
  message += `Cards reviewed: ${total}\n`;
  message += `${positiveLabel}: ${positiveCount}\n`;
  message += `${negativeLabel}: ${negativeCount}\n\n`;

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
  message += `${escapeHtml(term.definition)}\n\n`;
  message += `<i>Category: ${escapeHtml(term.category)}</i> · ${escapeHtml(term.domainName)}`;
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
  markedKnown = false,
): string {
  let message = formatReviewQuestion(term, questionIndex, totalQuestions);
  message += `\n\n<b>Your answer:</b> ${escapeHtml(selectedTerm)}`;

  if (isCorrect) {
    message += `\n\n✅ <b>Correct!</b>`;
    if (markedKnown) message += "\n<i>Marked as known.</i>";
  } else {
    message += `\n\n❌ <b>Wrong.</b> The correct answer was: <b>${escapeHtml(term.term)}</b>`;
    if (markedUnknown) message += "\n<i>Marked as unknown.</i>";
  }

  message += `\n\nScore: ${currentScore}/${totalQuestions}`;
  return message;
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

export function formatReviewSummary(
  score: number,
  total: number,
  status: "known" | "unknown",
): string {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  let message = `📊 <b>Quiz Complete!</b>\n\n`;
  message += `Score: ${score}/${total} (${percentage}%)\n`;
  message += `Status: ${status} terms\n\n`;

  if (percentage === 100) message += "🎉 Perfect score! Excellent work!";
  else if (percentage >= 80) message += "🌟 Great job! You know these terms well!";
  else if (percentage >= 60) message += "👍 Good effort! Keep practicing!";
  else message += "💪 Keep studying! You'll improve with practice!";

  return message;
}
