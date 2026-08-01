/**
 * Telegram Bot API transport — Edge only.
 * Presentation/formatting lives in Next.js (lib/telegram/presentation.ts).
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getTelegramBotToken } from "./env.ts";
import {
  editTrackedMessageText,
  hasInlineKeyboard,
  sendTrackedMessage,
} from "./inline-keyboard-tracker.ts";

export type TelegramMessage = {
  message_id: number;
};

export type TelegramAction =
  | {
      type: "sendMessage";
      chatId: number;
      text: string;
      replyMarkup?: Record<string, unknown>;
      trackKeyboard?: boolean;
    }
  | {
      type: "editMessageText";
      chatId: number;
      messageId: number;
      text: string;
      replyMarkup?: Record<string, unknown>;
    }
  | {
      type: "answerCallbackQuery";
      callbackQueryId: string;
      text?: string;
    }
  | {
      type: "typing";
      chatId: number;
    }
  | {
      type: "pause";
      chatId: number;
      ms: number;
    };

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
  supabase?: SupabaseClient,
  trackKeyboard = false,
): Promise<TelegramMessage> {
  const send = () =>
    telegramApi<TelegramMessage>("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
      link_preview_options: { is_disabled: true },
    });

  if (supabase && (trackKeyboard || (replyMarkup && hasInlineKeyboard(replyMarkup)))) {
    return sendTrackedMessage(supabase, chatId, send);
  }

  return send();
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function sendTypingAction(chatId: number): Promise<void> {
  try {
    await telegramApi("sendChatAction", {
      chat_id: chatId,
      action: "typing",
    });
  } catch (error) {
    console.error("Failed to send typing action:", error);
  }
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
  supabase?: SupabaseClient,
): Promise<TelegramMessage> {
  const edit = () =>
    telegramApi<TelegramMessage>("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: replyMarkup,
    });

  if (supabase) {
    return editTrackedMessageText(supabase, chatId, messageId, replyMarkup, edit);
  }

  return edit();
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Execute action DTOs from Next.js core. */
export async function executeTelegramActions(
  actions: TelegramAction[],
  supabase?: SupabaseClient,
): Promise<void> {
  for (const action of actions) {
    switch (action.type) {
      case "sendMessage":
        await sendMessage(
          action.chatId,
          action.text,
          action.replyMarkup,
          supabase,
          action.trackKeyboard,
        );
        break;
      case "editMessageText":
        await editMessageText(
          action.chatId,
          action.messageId,
          action.text,
          action.replyMarkup,
          supabase,
        );
        break;
      case "answerCallbackQuery":
        await answerCallbackQuery(action.callbackQueryId, action.text);
        break;
      case "typing":
        await sendTypingAction(action.chatId);
        break;
      case "pause":
        await sendTypingAction(action.chatId);
        await pause(action.ms);
        break;
      default:
        console.warn("Unknown telegram action", action);
    }
  }
}
