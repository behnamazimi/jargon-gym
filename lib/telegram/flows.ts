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

type MessageHandler = (
  client: Client,
  chatId: number,
  trimmed: string,
) => Promise<TelegramAction[]>;

async function routeStart(client: Client, chatId: number, trimmed: string) {
  return handleStart(client, chatId, parseStartToken(trimmed));
}

async function routeRead(client: Client, chatId: number) {
  return handleRead(client, chatId);
}

async function routeQuiz(client: Client, chatId: number, trimmed: string) {
  const userId = await resolveUserIdByChatId(client, chatId);
  if (!userId) return [send(chatId, CONNECT_MESSAGE)];
  return handleQuizCommand(client, chatId, userId, trimmed);
}

async function routeReview(client: Client, chatId: number, trimmed: string) {
  const userId = await resolveUserIdByChatId(client, chatId);
  if (!userId) return [send(chatId, CONNECT_MESSAGE)];
  return handleReviewCommand(client, chatId, userId, trimmed);
}

const MESSAGE_ROUTES: [predicate: (trimmed: string) => boolean, handler: MessageHandler][] = [
  [(trimmed) => trimmed.startsWith("/start"), routeStart],
  [isReadCommand, routeRead],
  [isQuizCommand, routeQuiz],
  [isReviewCommand, routeReview],
];

/** Neither /quiz nor /review setup owns this reply — fall back to help. */
async function routeSetupText(
  client: Client,
  chatId: number,
  userId: string,
  trimmed: string,
): Promise<TelegramAction[]> {
  const setupResult = await handleQuizSetupText(client, chatId, userId, trimmed);
  if (setupResult.handled) return setupResult.actions;

  const reviewSetupResult = await handleReviewSetupText(client, chatId, userId, trimmed);
  if (reviewSetupResult.handled) return reviewSetupResult.actions;

  return [send(chatId, HELP_MESSAGE)];
}

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

  const route = MESSAGE_ROUTES.find(([predicate]) => predicate(trimmed));
  if (route) {
    const [, handler] = route;
    return handler(client, chatId, trimmed);
  }

  const userId = await resolveUserIdByChatId(client, chatId);
  if (!userId) return [send(chatId, CONNECT_MESSAGE)];

  return routeSetupText(client, chatId, userId, trimmed);
}
