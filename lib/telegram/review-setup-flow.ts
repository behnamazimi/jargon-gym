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
  formatReviewCollectionChoiceLabel,
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
  type QuizCollectionSelection,
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

  if (!parsed.collectionId) {
    const setup: ReviewSetupState = { step: "collection", startedAt };
    await saveReviewSetup(client, chatId, setup);
    return sendReviewCollectionQuestion(client, chatId, userId);
  }

  const setup: ReviewSetupState = {
    step: "count",
    collectionId: parsed.collectionId,
    startedAt,
  };
  await saveReviewSetup(client, chatId, setup);
  return sendReviewCountQuestion(client, chatId, userId, parsed.collectionId);
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
    parsed.collectionId!,
    parsed.count ?? DEFAULT_TELEGRAM_REVIEW_COUNT,
  );

  await clearReviewSetup(client, chatId);
  return startReviewFlashcardSession(client, chatId, userId, parsed.collectionId!, count);
}

interface SetupCallbackContext {
  client: Client;
  chatId: number;
  userId: string;
  messageId: number;
}

async function handleReviewSetupCollectionCallback(
  parts: string[],
  ctx: SetupCallbackContext,
): Promise<TelegramAction[]> {
  const { client, chatId, userId, messageId } = ctx;
  const actions: TelegramAction[] = [];

  const setup = await loadReviewSetup(client, chatId);
  if (!setup) return actions;

  const collectionToken = parts.slice(1).join(":");
  const collectionId: QuizCollectionSelection = collectionToken === "all" ? "all" : collectionToken;
  if (collectionId !== "all" && !UUID_RE.test(collectionId)) return actions;

  const collectionLabel = await formatReviewCollectionChoiceLabel(client, userId, collectionId);
  actions.push(
    edit(
      chatId,
      messageId,
      formatSetupPromptWithAnswer(formatReviewSetupCollectionPrompt(), collectionLabel),
    ),
  );

  const countSetup: ReviewSetupState = {
    step: "count",
    collectionId,
    startedAt: Date.now(),
  };
  await saveReviewSetup(client, chatId, countSetup);
  actions.push(...(await sendReviewCountQuestion(client, chatId, userId, collectionId)));
  return actions;
}

async function resolveReviewSetupCount(
  client: Client,
  userId: string,
  collectionId: QuizCollectionSelection,
  countToken: string | undefined,
): Promise<number | null> {
  if (countToken === "all") {
    return resolveReviewCount(client, userId, collectionId, "all");
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
  if (!setup?.collectionId) return actions;

  const countToken = parts[1];
  const count = await resolveReviewSetupCount(client, userId, setup.collectionId, countToken);
  if (count === null) return actions;

  const available = await countTermsForReview(client, userId, setup.collectionId);
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
    ...(await startReviewFlashcardSession(client, chatId, userId, setup.collectionId, count)),
  );
  return actions;
}

type SetupCallbackHandler = (
  parts: string[],
  ctx: SetupCallbackContext,
) => Promise<TelegramAction[]>;

const SETUP_CALLBACK_HANDLERS: Record<string, SetupCallbackHandler> = {
  collection: handleReviewSetupCollectionCallback,
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
