import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getTelegramBotToken } from "./env.ts";

type TelegramMessage = {
  message_id: number;
};

async function telegramApi<T>(method: string, body: Record<string, unknown>): Promise<T> {
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

async function removeInlineKeyboard(chatId: number, messageId: number): Promise<void> {
  await telegramApi("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  });
}

export function hasInlineKeyboard(replyMarkup?: Record<string, unknown>): boolean {
  const rows = replyMarkup?.inline_keyboard;
  return Array.isArray(rows) && rows.length > 0;
}

async function getLastKeyboardMessageId(
  supabase: SupabaseClient,
  chatId: number,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("telegram_links")
    .select("last_keyboard_message_id")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  return data?.last_keyboard_message_id ?? null;
}

async function setLastKeyboardMessageId(
  supabase: SupabaseClient,
  chatId: number,
  messageId: number | null,
): Promise<void> {
  const { error } = await supabase
    .from("telegram_links")
    .update({
      last_keyboard_message_id: messageId,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

/** Remove the previously tracked inline keyboard in this chat, if any. */
export async function clearPreviousInlineKeyboard(
  supabase: SupabaseClient,
  chatId: number,
  exceptMessageId?: number,
): Promise<void> {
  const lastMessageId = await getLastKeyboardMessageId(supabase, chatId);
  if (lastMessageId == null || lastMessageId === exceptMessageId) {
    return;
  }

  try {
    await removeInlineKeyboard(chatId, lastMessageId);
  } catch (error) {
    console.error("Failed to clear previous inline keyboard:", error);
  }

  await setLastKeyboardMessageId(supabase, chatId, null);
}

/** Remove inline keyboard from a message and clear tracking when it matches. */
export async function dismissInlineKeyboard(
  supabase: SupabaseClient,
  chatId: number,
  messageId: number,
): Promise<void> {
  try {
    await removeInlineKeyboard(chatId, messageId);
  } catch (error) {
    console.error("Failed to dismiss inline keyboard:", error);
  }

  const lastMessageId = await getLastKeyboardMessageId(supabase, chatId);
  if (lastMessageId === messageId) {
    await setLastKeyboardMessageId(supabase, chatId, null);
  }
}

export async function registerInlineKeyboard(
  supabase: SupabaseClient,
  chatId: number,
  messageId: number,
): Promise<void> {
  await setLastKeyboardMessageId(supabase, chatId, messageId);
}

export async function sendTrackedMessage(
  supabase: SupabaseClient,
  chatId: number,
  send: () => Promise<TelegramMessage>,
): Promise<TelegramMessage> {
  await clearPreviousInlineKeyboard(supabase, chatId);
  const message = await send();
  await registerInlineKeyboard(supabase, chatId, message.message_id);
  return message;
}

export async function editTrackedMessageText(
  supabase: SupabaseClient,
  chatId: number,
  messageId: number,
  replyMarkup: Record<string, unknown> | undefined,
  edit: () => Promise<TelegramMessage>,
): Promise<TelegramMessage> {
  if (replyMarkup && hasInlineKeyboard(replyMarkup)) {
    await clearPreviousInlineKeyboard(supabase, chatId, messageId);
    const message = await edit();
    await registerInlineKeyboard(supabase, chatId, messageId);
    return message;
  }

  if (replyMarkup && !hasInlineKeyboard(replyMarkup)) {
    await dismissInlineKeyboard(supabase, chatId, messageId);
  }

  return edit();
}
