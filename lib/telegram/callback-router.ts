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

interface CallbackContext {
  client: Client;
  chatId: number;
  userId: string;
  messageId: number;
}

async function routeReviewReveal(rest: string, ctx: CallbackContext): Promise<TelegramAction[]> {
  const sessionIndex = parseInt(rest, 10);
  if (isNaN(sessionIndex)) return [];
  return handleReviewReveal(ctx.client, ctx.chatId, ctx.messageId, sessionIndex);
}

async function routeReviewKnown(rest: string, ctx: CallbackContext): Promise<TelegramAction[]> {
  const sessionIndex = parseInt(rest, 10);
  if (isNaN(sessionIndex)) return [];
  return handleReviewMarkKnown(ctx.client, ctx.chatId, ctx.messageId, sessionIndex);
}

async function routeReviewRate(rest: string, ctx: CallbackContext): Promise<TelegramAction[]> {
  const [sessionPart, gradePart] = rest.split(":");
  const sessionIndex = parseInt(sessionPart, 10);
  const grade = parseInt(gradePart, 10);
  if (isNaN(sessionIndex) || !isReviewGrade(grade)) return [];
  return handleReviewRate(ctx.client, ctx.chatId, ctx.messageId, sessionIndex, grade);
}

async function routeQuizAnswer(rest: string, ctx: CallbackContext): Promise<TelegramAction[]> {
  const [sessionPart, selectedTermId] = rest.split(":");
  if (!selectedTermId) return [];
  const sessionIndex = parseInt(sessionPart, 10);
  if (isNaN(sessionIndex)) return [];
  return handleReviewAnswer(ctx.client, ctx.chatId, ctx.messageId, sessionIndex, selectedTermId);
}

async function routeQuizTrueFalse(rest: string, ctx: CallbackContext): Promise<TelegramAction[]> {
  const [sessionPart, answerPart] = rest.split(":");
  if (answerPart !== "true" && answerPart !== "false") return [];
  const sessionIndex = parseInt(sessionPart, 10);
  if (isNaN(sessionIndex)) return [];
  return handleReviewTrueFalseAnswer(
    ctx.client,
    ctx.chatId,
    ctx.messageId,
    sessionIndex,
    answerPart === "true",
  );
}

async function routeReadReveal(rest: string, ctx: CallbackContext): Promise<TelegramAction[]> {
  return handleReadReveal(ctx.client, ctx.userId, ctx.chatId, ctx.messageId, rest);
}

async function routeReadKnown(rest: string, ctx: CallbackContext): Promise<TelegramAction[]> {
  return handleReadMarkKnown(ctx.client, ctx.userId, ctx.chatId, ctx.messageId, rest);
}

async function routeRead(rest: string, ctx: CallbackContext): Promise<TelegramAction[]> {
  return handleReadCallback(ctx.client, ctx.userId, ctx.chatId, ctx.messageId, rest);
}

async function routeQuizSetup(_rest: string, ctx: CallbackContext, data: string) {
  return handleQuizSetupCallback(ctx.client, ctx.chatId, ctx.userId, data, ctx.messageId);
}

async function routeReviewSetup(_rest: string, ctx: CallbackContext, data: string) {
  return handleReviewSetupCallback(ctx.client, ctx.chatId, ctx.userId, data, ctx.messageId);
}

type CallbackRoute = [
  prefix: string,
  handler: (rest: string, ctx: CallbackContext, data: string) => Promise<TelegramAction[]>,
];

const CALLBACK_ROUTES: CallbackRoute[] = [
  ["quizsetup:", routeQuizSetup],
  ["reviewsetup:", routeReviewSetup],
  ["review:reveal:", routeReviewReveal],
  ["review:known:", routeReviewKnown],
  ["review:rate:", routeReviewRate],
  ["quiz:", routeQuizAnswer],
  ["quiztf:", routeQuizTrueFalse],
  ["read:reveal:", routeReadReveal],
  ["read:known:", routeReadKnown],
  ["read:", routeRead],
];

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
  const ctx: CallbackContext = { client, chatId, userId, messageId };

  const route = CALLBACK_ROUTES.find(([prefix]) => data.startsWith(prefix));
  if (route) {
    const [prefix, handler] = route;
    actions.push(...(await handler(data.slice(prefix.length), ctx, data)));
  }

  return actions;
}
