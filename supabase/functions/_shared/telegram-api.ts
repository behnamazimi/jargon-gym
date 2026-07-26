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

function buildTermMessageBody(term: TermRow): string {
  let message = `<b>${escapeHtml(term.term)}</b>\n`;
  message += `<i>${escapeHtml(term.category)}</i> · ${escapeHtml(term.domain_name)}\n\n`;
  message += escapeHtml(term.definition.trim());

  message += formatQuotedSection("Example", term.example ?? "");
  message += formatQuotedSection("In practice", term.discussion ?? "");
  message += formatQuotedSection("Debated", term.controversy ?? "");
  message += formatRelationships(term.relationships ?? []);

  return message;
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
