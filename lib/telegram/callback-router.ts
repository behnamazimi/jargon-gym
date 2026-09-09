import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveUserIdByChatId } from "@/lib/jargon/term-delivery";
import { AGAIN, EASY, type ReviewGrade } from "@/lib/trace";
import type { TelegramAction } from "./actions";
import { CONNECT_MESSAGE } from "./copy";
import { handleReadCallback, handleReadMarkKnown, handleReadReveal } from "./delivery-flow";
import {
  handleQuizSetupCallback,
  handleReviewAnswer,
  handleReviewTrueFalseAnswer,
} from "./quiz-flow";
import {
  handleReviewMarkKnown,
  handleReviewRate,
  handleReviewReveal,
  handleReviewSetupCallback,
} from "./review-flow";
import type { NormalizedTelegramUpdate } from "./flows";
import { send } from "./transport";

type Client = SupabaseClient<Database>;

/** ReviewGrade's runtime domain is the contiguous integers AGAIN..EASY. */
function isReviewGrade(value: number): value is ReviewGrade {
  return Number.isInteger(value) && value >= AGAIN && value <= EASY;
}

export async function handleCallback(
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

  if (data.startsWith("review:known:")) {
    const sessionIndex = parseInt(data.slice("review:known:".length), 10);
    if (!isNaN(sessionIndex)) {
      actions.push(...(await handleReviewMarkKnown(client, chatId, messageId, sessionIndex)));
    }
    return actions;
  }

  if (data.startsWith("review:rate:")) {
    const parts = data.slice("review:rate:".length).split(":");
    if (parts.length === 2) {
      const sessionIndex = parseInt(parts[0], 10);
      const grade = parseInt(parts[1], 10);
      if (!isNaN(sessionIndex) && isReviewGrade(grade)) {
        actions.push(...(await handleReviewRate(client, chatId, messageId, sessionIndex, grade)));
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

  if (data.startsWith("read:known:")) {
    const termId = data.slice("read:known:".length);
    actions.push(...(await handleReadMarkKnown(client, userId, chatId, messageId, termId)));
    return actions;
  }

  if (data.startsWith("read:")) {
    const termId = data.slice("read:".length);
    actions.push(...(await handleReadCallback(client, userId, chatId, messageId, termId)));
    return actions;
  }

  return actions;
}
