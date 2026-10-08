import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TelegramAction } from "./actions";
import {
  formatQuizSetupCollectionPrompt,
  formatQuizSetupCountPrompt,
  formatSetupPromptWithAnswer,
} from "./presentation";
import { parseQuizCommand, UUID_RE, type ParsedQuizCommand } from "./quiz-parse";
import { startReviewSession } from "./quiz-session-flow";
import {
  formatCollectionChoiceLabel,
  resolveQuizCount,
  sendCollectionQuestion,
  sendCountQuestion,
} from "./quiz-setup-prompts";
import {
  clearQuizSetup,
  countTermsForQuiz,
  DEFAULT_TELEGRAM_QUIZ_COUNT,
  getMaxQuizQuestionCount,
  loadQuizSetup,
  saveQuizSetup,
  type QuizCollectionSelection,
  type QuizSetupState,
} from "./session-store";
import { edit, send } from "./transport";

type Client = SupabaseClient<Database>;

async function startQuizSetup(
  client: Client,
  chatId: number,
  userId: string,
  parsed: ParsedQuizCommand,
): Promise<TelegramAction[]> {
  const startedAt = Date.now();

  if (!parsed.collectionId) {
    const setup: QuizSetupState = { step: "collection", startedAt };
    await saveQuizSetup(client, chatId, setup);
    return sendCollectionQuestion(client, chatId, userId);
  }

  const setup: QuizSetupState = {
    step: "count",
    collectionId: parsed.collectionId,
    startedAt,
  };
  await saveQuizSetup(client, chatId, setup);
  return sendCountQuestion(client, chatId, userId, parsed.collectionId);
}

export async function handleQuizCommand(
  client: Client,
  chatId: number,
  userId: string,
  text: string,
): Promise<TelegramAction[]> {
  const parsed = parseQuizCommand(text);

  if (parsed.error) {
    return [send(chatId, parsed.error)];
  }

  if (!parsed.complete) {
    return startQuizSetup(client, chatId, userId, parsed);
  }

  const count = await resolveQuizCount(
    client,
    userId,
    parsed.collectionId!,
    parsed.count ?? DEFAULT_TELEGRAM_QUIZ_COUNT,
  );

  await clearQuizSetup(client, chatId);
  return startReviewSession(client, chatId, userId, parsed.collectionId!, count);
}

async function handleQuizSetupCollection(
  client: Client,
  chatId: number,
  userId: string,
  messageId: number,
  parts: string[],
): Promise<TelegramAction[]> {
  const actions: TelegramAction[] = [];
  const collectionToken = parts.slice(1).join(":");
  const collectionId: QuizCollectionSelection = collectionToken === "all" ? "all" : collectionToken;
  if (collectionId !== "all" && !UUID_RE.test(collectionId)) return actions;

  const collectionLabel = await formatCollectionChoiceLabel(client, userId, collectionId);
  actions.push(
    edit(
      chatId,
      messageId,
      formatSetupPromptWithAnswer(formatQuizSetupCollectionPrompt(), collectionLabel),
    ),
  );

  const countSetup: QuizSetupState = {
    step: "count",
    collectionId,
    startedAt: Date.now(),
  };
  await saveQuizSetup(client, chatId, countSetup);
  actions.push(...(await sendCountQuestion(client, chatId, userId, collectionId)));
  return actions;
}

async function handleQuizSetupCount(
  client: Client,
  chatId: number,
  userId: string,
  messageId: number,
  parts: string[],
): Promise<TelegramAction[]> {
  const actions: TelegramAction[] = [];
  const setup = await loadQuizSetup(client, chatId);
  if (!setup?.collectionId) return actions;

  const countToken = parts[1];
  let count: number;

  if (countToken === "all") {
    count = await resolveQuizCount(client, userId, setup.collectionId, "all");
  } else {
    count = parseInt(countToken, 10);
    if (isNaN(count) || count < 1) return actions;
  }

  const available = await countTermsForQuiz(client, userId, setup.collectionId);
  const maxCount = getMaxQuizQuestionCount(available);
  const defaultCount = Math.min(DEFAULT_TELEGRAM_QUIZ_COUNT, maxCount);
  const countLabel =
    countToken === "all" ? `All (${count})` : `${count} question${count === 1 ? "" : "s"}`;

  actions.push(
    edit(
      chatId,
      messageId,
      formatSetupPromptWithAnswer(formatQuizSetupCountPrompt(maxCount, defaultCount), countLabel),
    ),
  );

  await clearQuizSetup(client, chatId);
  actions.push(...(await startReviewSession(client, chatId, userId, setup.collectionId, count)));

  return actions;
}

export async function handleQuizSetupCallback(
  client: Client,
  chatId: number,
  userId: string,
  data: string,
  messageId: number,
): Promise<TelegramAction[]> {
  const parts = data.slice("quizsetup:".length).split(":");
  const action = parts[0];

  if (action === "collection") {
    return handleQuizSetupCollection(client, chatId, userId, messageId, parts);
  }
  if (action === "count") {
    return handleQuizSetupCount(client, chatId, userId, messageId, parts);
  }

  return [];
}

export { handleQuizSetupText } from "./quiz-setup-text";
