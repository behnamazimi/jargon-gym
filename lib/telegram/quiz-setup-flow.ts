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
  formatDomainChoiceLabel,
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
  type QuizDomainSelection,
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

  if (!parsed.domainId) {
    const setup: QuizSetupState = { step: "collection", startedAt };
    await saveQuizSetup(client, chatId, setup);
    return sendCollectionQuestion(client, chatId, userId);
  }

  const setup: QuizSetupState = {
    step: "count",
    domainId: parsed.domainId,
    startedAt,
  };
  await saveQuizSetup(client, chatId, setup);
  return sendCountQuestion(client, chatId, userId, parsed.domainId);
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
    parsed.domainId!,
    parsed.count ?? DEFAULT_TELEGRAM_QUIZ_COUNT,
  );

  await clearQuizSetup(client, chatId);
  return startReviewSession(client, chatId, userId, parsed.domainId!, count);
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
  const actions: TelegramAction[] = [];

  if (action === "domain") {
    const domainToken = parts.slice(1).join(":");
    const domainId: QuizDomainSelection = domainToken === "all" ? "all" : domainToken;
    if (domainId !== "all" && !UUID_RE.test(domainId)) return actions;

    const domainLabel = await formatDomainChoiceLabel(client, userId, domainId);
    actions.push(
      edit(
        chatId,
        messageId,
        formatSetupPromptWithAnswer(formatQuizSetupCollectionPrompt(), domainLabel),
      ),
    );

    const countSetup: QuizSetupState = {
      step: "count",
      domainId,
      startedAt: Date.now(),
    };
    await saveQuizSetup(client, chatId, countSetup);
    actions.push(...(await sendCountQuestion(client, chatId, userId, domainId)));
    return actions;
  }

  if (action === "count") {
    const setup = await loadQuizSetup(client, chatId);
    if (!setup?.domainId) return actions;

    const countToken = parts[1];
    let count: number;

    if (countToken === "all") {
      count = await resolveQuizCount(client, userId, setup.domainId, "all");
    } else {
      count = parseInt(countToken, 10);
      if (isNaN(count) || count < 1) return actions;
    }

    const available = await countTermsForQuiz(client, userId, setup.domainId);
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
    actions.push(...(await startReviewSession(client, chatId, userId, setup.domainId, count)));
  }

  return actions;
}

export { handleQuizSetupText } from "./quiz-setup-text";
