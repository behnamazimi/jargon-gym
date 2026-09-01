/**
 * Telegram bot update router.
 * Flow modules own command/callback logic; this file dispatches only.
 * Returns TelegramAction DTOs — Edge executes transport.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveUserIdByChatId } from "@/lib/jargon/term-delivery";
import type { TelegramAction } from "./actions";
import {
  handleStart,
  isQuizCommand,
  isReadCommand,
  isReviewCommand,
  parseStartToken,
} from "./commands";
import { CONNECT_MESSAGE, HELP_MESSAGE } from "./copy";
import { handleRead, handleReadCallback, handleReadReveal, handleSendDue } from "./delivery-flow";
import {
  handleQuizCommand,
  handleQuizSetupCallback,
  handleQuizSetupText,
  handleReviewAnswer,
  handleReviewTrueFalseAnswer,
} from "./quiz-flow";
import {
  handleReviewCommand,
  handleReviewRate,
  handleReviewReveal,
  handleReviewSetupCallback,
  handleReviewSetupText,
} from "./review-flow";
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

async function handleCallback(
  client: Client,
  callback: NonNullable<NormalizedTelegramUpdate["callbackQuery"]>,
): Promise<TelegramAction[]> {
  const { chatId, messageId, data, id: callbackId } = callback;
  const userId = await resolveUserIdByChatId(client, chatId);

  if (!userId) {
    return [
      {
        type: "answerCallbackQuery",
        callbackQueryId: callbackId,
        text: "Connect in Jargon Gym settings first.",
      },
      send(chatId, CONNECT_MESSAGE),
    ];
  }

  const actions: TelegramAction[] = [{ type: "answerCallbackQuery", callbackQueryId: callbackId }];

  if (data.startsWith("quizsetup:")) {
    actions.push(...(await handleQuizSetupCallback(client, chatId, userId, data, messageId)));
    return actions;
  }

  if (data.startsWith("reviewsetup:")) {
    actions.push(...(await handleReviewSetupCallback(client, chatId, userId, data, messageId)));
    return actions;
  }

  if (data.startsWith("review:reveal:")) {
    const sessionIndex = parseInt(data.slice("review:reveal:".length), 10);
    if (!isNaN(sessionIndex)) {
      actions.push(...(await handleReviewReveal(client, chatId, messageId, sessionIndex)));
    }
    return actions;
  }

  if (data.startsWith("review:rate:")) {
    const parts = data.slice("review:rate:".length).split(":");
    if (parts.length === 2 && (parts[1] === "yes" || parts[1] === "no")) {
      const sessionIndex = parseInt(parts[0], 10);
      if (!isNaN(sessionIndex)) {
        actions.push(
          ...(await handleReviewRate(client, chatId, messageId, sessionIndex, parts[1] === "yes")),
        );
      }
    }
    return actions;
  }

  if (data.startsWith("quiz:")) {
    const parts = data.slice("quiz:".length).split(":");
    if (parts.length === 2) {
      const sessionIndex = parseInt(parts[0], 10);
      const selectedTermId = parts[1];
      actions.push(
        ...(await handleReviewAnswer(client, chatId, messageId, sessionIndex, selectedTermId)),
      );
      return actions;
    }
  }

  if (data.startsWith("quiztf:")) {
    const parts = data.slice("quiztf:".length).split(":");
    if (parts.length === 2 && (parts[1] === "true" || parts[1] === "false")) {
      const sessionIndex = parseInt(parts[0], 10);
      if (!isNaN(sessionIndex)) {
        actions.push(
          ...(await handleReviewTrueFalseAnswer(
            client,
            chatId,
            messageId,
            sessionIndex,
            parts[1] === "true",
          )),
        );
        return actions;
      }
    }
  }

  if (data.startsWith("read:reveal:")) {
    const termId = data.slice("read:reveal:".length);
    actions.push(...(await handleReadReveal(client, userId, chatId, messageId, termId)));
    return actions;
  }

  if (data.startsWith("read:")) {
    const termId = data.slice("read:".length);
    actions.push(...(await handleReadCallback(client, userId, chatId, messageId, termId)));
    return actions;
  }

  return actions;
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
