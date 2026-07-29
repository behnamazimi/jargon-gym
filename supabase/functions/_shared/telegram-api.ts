import { getAppBaseUrl, getTelegramBotToken } from "./env.ts";

export type TermRelationshipRow = {
  direction: "outgoing" | "incoming";
  relationship_type: string;
  related_term_name: string;
  description: string;
};

export type TermRow = {
  id: string;
  term: string;
  category: string;
  definition: string;
  example: string | null;
  discussion: string | null;
  controversy: string | null;
  domain_id: string;
  domain_name: string;
  relationships: TermRelationshipRow[];
};

const TELEGRAM_MESSAGE_LIMIT = 4096;

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildGoogleSearchUrl(term: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${term} definition`)}`;
}

function formatQuotedSection(title: string, body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";

  return `\n\n<b>${escapeHtml(title)}</b>\n<blockquote>${escapeHtml(trimmed)}</blockquote>`;
}

function formatRelationships(relationships: TermRelationshipRow[]): string {
  if (relationships.length === 0) return "";

  let section = `\n\n<b>Relationships</b>`;

  for (const relationship of relationships) {
    const type = escapeHtml(relationship.relationship_type);
    const name = escapeHtml(relationship.related_term_name);
    section += `\n· <i>${type}</i> <b>${name}</b>`;

    if (relationship.description?.trim()) {
      section += `\n  ${escapeHtml(relationship.description.trim())}`;
    }
  }

  return section;
}

function buildTermHeader(term: TermRow): string {
  return (
    `<b>${escapeHtml(term.term)}</b>\n` +
    `<i>${escapeHtml(term.category)}</i> · ${escapeHtml(term.domain_name)}`
  );
}

function buildTermDetails(term: TermRow): string {
  let details = escapeHtml(term.definition.trim());

  details += formatQuotedSection("Example", term.example ?? "");
  details += formatQuotedSection("In practice", term.discussion ?? "");
  details += formatQuotedSection("Debated", term.controversy ?? "");
  details += formatRelationships(term.relationships ?? []);

  return details;
}

function buildTermMessageBody(term: TermRow): string {
  return `${buildTermHeader(term)}\n\n${buildTermDetails(term)}`;
}

function appendSearchLink(message: string, termName: string): string {
  const searchUrl = buildGoogleSearchUrl(termName);
  return `${message}\n\n<a href="${searchUrl}">Search "${escapeHtml(termName)}" on Google</a>`;
}

function trimMessageBody(body: string, reservedLength: number): string {
  const maxBodyLength = TELEGRAM_MESSAGE_LIMIT - reservedLength;

  if (body.length <= maxBodyLength) {
    return body;
  }

  return `${body.slice(0, Math.max(0, maxBodyLength - 1)).trimEnd()}…`;
}

export function formatTermMessage(term: TermRow): string {
  const body = buildTermMessageBody(term);
  const searchLink = appendSearchLink("", term.term);
  const reservedLength = searchLink.length;

  if (body.length + reservedLength <= TELEGRAM_MESSAGE_LIMIT) {
    return appendSearchLink(body, term.term);
  }

  return appendSearchLink(trimMessageBody(body, reservedLength), term.term);
}

/**
 * Same content as `formatTermMessage`, but with everything except the term
 * name, category, and domain hidden behind a Telegram spoiler. Used once a
 * term is marked known so it reads like a flash card the user reveals by tapping.
 */
export function formatMaskedTermMessage(term: TermRow): string {
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

export function buildInlineKeyboard(term: TermRow) {
  const base = getAppBaseUrl();
  const webUrl = `${base}/jargon?domain=${encodeURIComponent(term.domain_id)}&termId=${encodeURIComponent(term.id)}`;

  return {
    inline_keyboard: [
      [
        { text: "Mark known", callback_data: `known:${term.id}` },
        { text: "Skip", callback_data: `skip:${term.id}` },
      ],
      [{ text: "Open in web", url: webUrl }],
    ],
  };
}

export async function telegramApi<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = getTelegramBotToken();
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.description ?? `Telegram API ${method} failed`);
  }

  return payload.result as T;
}

export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  return telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
    link_preview_options: { is_disabled: true },
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  return telegramApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: replyMarkup,
  });
}

export type CollectionStatsRow = {
  id: string;
  name: string;
  isActive: boolean;
  knownCount: number;
  totalCount: number;
  percentage: number;
};

function formatProgressBar(percentage: number, width: number = 10): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

export function formatStatsMessage(stats: CollectionStatsRow[]): string {
  if (stats.length === 0) {
    return "You have no collections in your review pool. Add some in the app!";
  }

  const activeCollections = stats.filter((s) => s.isActive);
  const pausedCollections = stats.filter((s) => !s.isActive);

  let message = `<b>📊 Your Collection Stats</b>\n\n`;
  message += `<b>Total collections:</b> ${stats.length}\n`;
  message += `<b>Active:</b> ${activeCollections.length} · <b>Paused:</b> ${pausedCollections.length}\n`;

  if (activeCollections.length > 0) {
    message += `\n<b>🟢 Active Collections</b>\n`;
    for (const collection of activeCollections) {
      const bar = formatProgressBar(collection.percentage);
      message += `\n<b>${escapeHtml(collection.name)}</b>\n`;
      message += `${bar} ${collection.knownCount}/${collection.totalCount} · ${collection.percentage}%\n`;
    }
  }

  if (pausedCollections.length > 0) {
    message += `\n<b>⏸️ Paused Collections</b>\n`;
    for (const collection of pausedCollections) {
      message += `\n<b>${escapeHtml(collection.name)}</b>\n`;
      message += `${collection.knownCount}/${collection.totalCount} known · ${collection.percentage}%\n`;
    }
  }

  return message;
}

// Review session message formatting

interface QuizOption {
  id: string;
  term: string;
}

export function formatReviewQuestion(
  term: TermRow,
  currentIndex: number,
  totalQuestions: number,
): string {
  let message = `<b>Question ${currentIndex + 1}/${totalQuestions}</b>\n\n`;
  message += `${escapeHtml(term.definition)}\n\n`;
  message += `<i>Category: ${escapeHtml(term.category)}</i> · ${escapeHtml(term.domain_name)}`;
  return message;
}

export function buildReviewKeyboard(options: QuizOption[], sessionIndex: number) {
  // Build inline keyboard with 2 buttons per row for 4 options
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  for (let i = 0; i < options.length; i += 2) {
    const row = [];
    row.push({
      text: options[i].term,
      callback_data: `quiz:${sessionIndex}:${options[i].id}`,
    });
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

export function formatReviewResult(
  isCorrect: boolean,
  correctTerm: string,
  selectedTerm: string,
  currentScore: number,
  totalQuestions: number,
): string {
  let message = isCorrect
    ? `✅ <b>Correct!</b>`
    : `❌ <b>Wrong.</b> The correct answer was: <b>${escapeHtml(correctTerm)}</b>`;

  message += `\n\nScore: ${currentScore}/${totalQuestions}`;
  return message;
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

  // Add encouragement based on score
  if (percentage === 100) {
    message += "🎉 Perfect score! Excellent work!";
  } else if (percentage >= 80) {
    message += "🌟 Great job! You know these terms well!";
  } else if (percentage >= 60) {
    message += "👍 Good effort! Keep practicing!";
  } else {
    message += "💪 Keep studying! You'll improve with practice!";
  }

  return message;
}
