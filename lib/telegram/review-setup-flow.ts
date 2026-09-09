import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getMaxStudyCount } from "@/lib/study";
import type { TelegramAction } from "./actions";
import { DEFAULT_TELEGRAM_REVIEW_COUNT } from "./constants";
import {
  formatReviewSetupCollectionPrompt,
  formatReviewSetupCountPrompt,
  formatSetupPromptWithAnswer,
} from "./presentation";
import { UUID_RE } from "./command-parse";
import { parseReviewCommand, type ParsedReviewCommand } from "./review-parse";
import { startReviewFlashcardSession } from "./review-session-flow";
import {
  formatReviewDomainChoiceLabel,
  resolveReviewCount,
  sendReviewCollectionQuestion,
  sendReviewCountQuestion,
} from "./review-setup-prompts";
import {
  clearReviewSetup,
  clearTelegramInteractionState,
  countTermsForReview,
  loadReviewSetup,
  saveReviewSetup,
  type QuizDomainSelection,
  type ReviewSetupState,
} from "./session-store";
import { edit, send } from "./transport";

type Client = SupabaseClient<Database>;

async function startReviewSetup(
  client: Client,
  chatId: number,
  userId: string,
  parsed: ParsedReviewCommand,
): Promise<TelegramAction[]> {
  const startedAt = Date.now();

  if (!parsed.domainId) {
    const setup: ReviewSetupState = { step: "collection", startedAt };
    await saveReviewSetup(client, chatId, setup);
    return sendReviewCollectionQuestion(client, chatId, userId);
  }

  const setup: ReviewSetupState = {
    step: "count",
    domainId: parsed.domainId,
    startedAt,
  };
  await saveReviewSetup(client, chatId, setup);
  return sendReviewCountQuestion(client, chatId, userId, parsed.domainId);
}

export async function handleReviewCommand(
  client: Client,
  chatId: number,
  userId: string,
  text: string,
): Promise<TelegramAction[]> {
  await clearTelegramInteractionState(client, chatId);

  const parsed = parseReviewCommand(text);

  if (parsed.error) {
    return [send(chatId, parsed.error)];
  }

  if (!parsed.complete) {
    return startReviewSetup(client, chatId, userId, parsed);
  }

  const count = await resolveReviewCount(
    client,
    userId,
    parsed.domainId!,
    parsed.count ?? DEFAULT_TELEGRAM_REVIEW_COUNT,
  );

  await clearReviewSetup(client, chatId);
  return startReviewFlashcardSession(client, chatId, userId, parsed.domainId!, count);
}

interface SetupCallbackContext {
  client: Client;
  chatId: number;
  userId: string;
  messageId: number;
}

async function handleReviewSetupDomainCallback(
  parts: string[],
  ctx: SetupCallbackContext,
): Promise<TelegramAction[]> {
  const { client, chatId, userId, messageId } = ctx;
  const actions: TelegramAction[] = [];

  const setup = await loadReviewSetup(client, chatId);
  if (!setup) return actions;

  const domainToken = parts.slice(1).join(":");
  const domainId: QuizDomainSelection = domainToken === "all" ? "all" : domainToken;
  if (domainId !== "all" && !UUID_RE.test(domainId)) return actions;

  const domainLabel = await formatReviewDomainChoiceLabel(client, userId, domainId);
  actions.push(
    edit(
      chatId,
      messageId,
      formatSetupPromptWithAnswer(formatReviewSetupCollectionPrompt(), domainLabel),
    ),
  );

  const countSetup: ReviewSetupState = {
    step: "count",
    domainId,
    startedAt: Date.now(),
  };
  await saveReviewSetup(client, chatId, countSetup);
  actions.push(...(await sendReviewCountQuestion(client, chatId, userId, domainId)));
  return actions;
}

async function resolveReviewSetupCount(
  client: Client,
  userId: string,
  domainId: QuizDomainSelection,
  countToken: string | undefined,
): Promise<number | null> {
  if (countToken === "all") {
    return resolveReviewCount(client, userId, domainId, "all");
  }
  const count = parseInt(countToken ?? "", 10);
  return isNaN(count) || count < 1 ? null : count;
}

async function handleReviewSetupCountCallback(
  parts: string[],
  ctx: SetupCallbackContext,
): Promise<TelegramAction[]> {
  const { client, chatId, userId, messageId } = ctx;
  const actions: TelegramAction[] = [];

  const setup = await loadReviewSetup(client, chatId);
  if (!setup?.domainId) return actions;

  const countToken = parts[1];
  const count = await resolveReviewSetupCount(client, userId, setup.domainId, countToken);
  if (count === null) return actions;

  const available = await countTermsForReview(client, userId, setup.domainId);
  const maxCount = getMaxStudyCount(available);
  const defaultCount = Math.min(DEFAULT_TELEGRAM_REVIEW_COUNT, maxCount);
  const countLabel =
    countToken === "all" ? `All (${count})` : `${count} card${count === 1 ? "" : "s"}`;

  actions.push(
    edit(
      chatId,
      messageId,
      formatSetupPromptWithAnswer(formatReviewSetupCountPrompt(maxCount, defaultCount), countLabel),
    ),
  );

  await clearReviewSetup(client, chatId);
  actions.push(
    ...(await startReviewFlashcardSession(client, chatId, userId, setup.domainId, count)),
  );
  return actions;
}

type SetupCallbackHandler = (
  parts: string[],
  ctx: SetupCallbackContext,
) => Promise<TelegramAction[]>;

const SETUP_CALLBACK_HANDLERS: Record<string, SetupCallbackHandler> = {
  domain: handleReviewSetupDomainCallback,
  count: handleReviewSetupCountCallback,
};

export async function handleReviewSetupCallback(
  client: Client,
  chatId: number,
  userId: string,
  data: string,
  messageId: number,
): Promise<TelegramAction[]> {
  const parts = data.slice("reviewsetup:".length).split(":");
  const action = parts[0]!;

  const handler = SETUP_CALLBACK_HANDLERS[action];
  if (!handler) return [];

  return handler(parts, { client, chatId, userId, messageId });
}

export { handleReviewSetupText } from "./review-setup-text";
