/**
 * Telegram bot update router.
 * Flow modules own command/callback logic; this file dispatches only.
 * Returns TelegramAction DTOs — Edge executes transport.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveUserIdByChatId } from "@/lib/jargon/term-delivery";
import type { TelegramAction } from "./actions";
import { handleCallback } from "./callback-router";
import {
  handleStart,
  isQuizCommand,
  isReadCommand,
  isReviewCommand,
  parseStartToken,
} from "./commands";
import { CONNECT_MESSAGE, HELP_MESSAGE } from "./copy";
import { handleRead, handleSendDue } from "./delivery-flow";
import { handleQuizCommand, handleQuizSetupText } from "./quiz-flow";
import { handleReviewCommand, handleReviewSetupText } from "./review-flow";
import { send } from "./transport";

type Client = SupabaseClient<Database>;

export type NormalizedTelegramUpdate = {
  message?: {
    chatId: number;
    text: string;
  };
  callbackQuery?: {
    id: string;
    data: string;
    chatId: number;
    messageId: number;
    messageText?: string;
  };
};

export { handleSendDue };

/** Main entry: process a normalized Telegram update into transport actions. */
export async function handleTelegramUpdate(
  client: Client,
  update: NormalizedTelegramUpdate,
): Promise<TelegramAction[]> {
  if (update.callbackQuery) {
    return handleCallback(client, update.callbackQuery);
  }

  const message = update.message;
  if (!message?.text) return [];

  const { chatId, text } = message;
  const trimmed = text.trim();

  if (trimmed.startsWith("/start")) {
    return handleStart(client, chatId, parseStartToken(trimmed));
  }
  if (isReadCommand(trimmed)) {
    return handleRead(client, chatId);
  }
  if (isQuizCommand(trimmed)) {
    const userId = await resolveUserIdByChatId(client, chatId);
    if (!userId) return [send(chatId, CONNECT_MESSAGE)];
    return handleQuizCommand(client, chatId, userId, trimmed);
  }
  if (isReviewCommand(trimmed)) {
    const userId = await resolveUserIdByChatId(client, chatId);
    if (!userId) return [send(chatId, CONNECT_MESSAGE)];
    return handleReviewCommand(client, chatId, userId, trimmed);
  }

  const userId = await resolveUserIdByChatId(client, chatId);
  if (!userId) return [send(chatId, CONNECT_MESSAGE)];

  const setupResult = await handleQuizSetupText(client, chatId, userId, trimmed);
  if (setupResult.handled) return setupResult.actions;

  const reviewSetupResult = await handleReviewSetupText(client, chatId, userId, trimmed);
  if (reviewSetupResult.handled) return reviewSetupResult.actions;

  return [send(chatId, HELP_MESSAGE)];
}
