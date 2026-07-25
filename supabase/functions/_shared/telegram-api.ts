import { getAppBaseUrl, getTelegramBotToken } from "./env.ts";

export type TermRow = {
  id: string;
  term: string;
  category: string;
  definition: string;
  example: string | null;
  discussion: string | null;
  domain_id: string;
  domain_name: string;
};

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatTermMessage(term: TermRow): string {
  let message = `<b>${escapeHtml(term.term)}</b>\n`;
  message += `<i>${escapeHtml(term.category)}</i> · ${escapeHtml(term.domain_name)}\n\n`;
  message += escapeHtml(term.definition);

  if (term.example?.trim()) {
    message += `\n\n<b>Example:</b> ${escapeHtml(term.example.trim())}`;
  }

  if (term.discussion?.trim()) {
    message += `\n\n<b>Discussion:</b> ${escapeHtml(term.discussion.trim())}`;
  }

  if (message.length > 4096) {
    return `${message.slice(0, 4093)}…`;
  }

  return message;
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
    reply_markup: replyMarkup,
  });
}
