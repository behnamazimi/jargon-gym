import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TelegramAction } from "./actions";
import { formatQuizSetupCountPrompt, formatSetupPromptWithAnswer } from "./presentation";
import { startReviewSession } from "./quiz-session-flow";
import { resolveQuizCount } from "./quiz-setup-prompts";
import {
  clearQuizSetup,
  countTermsForQuiz,
  DEFAULT_TELEGRAM_QUIZ_COUNT,
  getMaxQuizQuestionCount,
  loadQuizSetup,
  type QuizCollectionSelection,
} from "./session-store";
import { edit, send } from "./transport";

type Client = SupabaseClient<Database>;

type CountResolution = { count: number } | { errorActions: TelegramAction[] };

async function resolveSetupTextCount(
  client: Client,
  chatId: number,
  userId: string,
  collectionId: QuizCollectionSelection,
  trimmed: string,
): Promise<CountResolution> {
  if (trimmed === "") {
    const available = await countTermsForQuiz(client, userId, collectionId);
    return { count: Math.min(DEFAULT_TELEGRAM_QUIZ_COUNT, getMaxQuizQuestionCount(available)) };
  }

  if (trimmed.toLowerCase() === "all") {
    return { count: await resolveQuizCount(client, userId, collectionId, "all") };
  }

  const parsed = parseInt(trimmed, 10);
  if (isNaN(parsed) || parsed < 1) {
    return {
      errorActions: [send(chatId, "Send a valid number, tap a button, or /quiz to start over.")],
    };
  }

  const maxCount = getMaxQuizQuestionCount(await countTermsForQuiz(client, userId, collectionId));
  if (parsed > maxCount) {
    return {
      errorActions: [send(chatId, `Maximum for this selection is ${maxCount}. Try again.`)],
    };
  }

  return { count: parsed };
}

function formatSetupCountLabel(trimmed: string, count: number, defaultCount: number): string {
  if (trimmed === "") return `${defaultCount} (default)`;
  if (trimmed.toLowerCase() === "all") return `All (${count})`;
  return `${count} question${count === 1 ? "" : "s"}`;
}

export async function handleQuizSetupText(
  client: Client,
  chatId: number,
  userId: string,
  text: string,
): Promise<{ handled: boolean; actions: TelegramAction[] }> {
  const setup = await loadQuizSetup(client, chatId);
  if (!setup || setup.step !== "count" || !setup.collectionId) {
    return { handled: false, actions: [] };
  }

  const trimmed = text.trim();
  if (trimmed.startsWith("/")) {
    return { handled: false, actions: [] };
  }

  const resolution = await resolveSetupTextCount(
    client,
    chatId,
    userId,
    setup.collectionId,
    trimmed,
  );
  if ("errorActions" in resolution) {
    return { handled: true, actions: resolution.errorActions };
  }
  const { count } = resolution;

  const actions: TelegramAction[] = [];
  const available = await countTermsForQuiz(client, userId, setup.collectionId);
  const maxCount = getMaxQuizQuestionCount(available);
  const defaultCount = Math.min(DEFAULT_TELEGRAM_QUIZ_COUNT, maxCount);

  if (setup.promptMessageId) {
    const countLabel = formatSetupCountLabel(trimmed, count, defaultCount);
    actions.push(
      edit(
        chatId,
        setup.promptMessageId,
        formatSetupPromptWithAnswer(formatQuizSetupCountPrompt(maxCount, defaultCount), countLabel),
      ),
    );
  }

  await clearQuizSetup(client, chatId);
  actions.push(...(await startReviewSession(client, chatId, userId, setup.collectionId, count)));

  return { handled: true, actions };
}
