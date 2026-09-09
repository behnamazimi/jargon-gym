import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchCollectionStats } from "@/lib/jargon/collection-stats";
import type { TelegramAction } from "./actions";
import { NO_KNOWN_TERMS_FOR_QUIZ_MESSAGE } from "./copy";
import {
  buildQuizCollectionKeyboard,
  buildQuizCountKeyboard,
  formatQuizSetupCollectionPrompt,
  formatQuizSetupCountPrompt,
} from "./presentation";
import {
  clearQuizSetup,
  countTermsForQuiz,
  DEFAULT_TELEGRAM_QUIZ_COUNT,
  getMaxQuizQuestionCount,
  type QuizDomainSelection,
} from "./session-store";
import { send } from "./transport";

type Client = SupabaseClient<Database>;

export async function resolveQuizCount(
  client: Client,
  userId: string,
  domainId: QuizDomainSelection,
  requestedCount: number | "all",
): Promise<number> {
  const available = await countTermsForQuiz(client, userId, domainId);
  const maxCount = getMaxQuizQuestionCount(available);
  if (maxCount === 0) return 0;
  if (requestedCount === "all") return maxCount;
  return Math.min(requestedCount, maxCount);
}

export async function sendCollectionQuestion(
  client: Client,
  chatId: number,
  userId: string,
): Promise<TelegramAction[]> {
  const stats = await fetchCollectionStats(client, userId, "quiz");
  const activeCollections = stats.filter((collection) => collection.isActive);

  if (activeCollections.length === 0) {
    await clearQuizSetup(client, chatId);
    return [
      send(
        chatId,
        "You have no active collections in your review pool. Turn one on in the app first.",
      ),
    ];
  }

  const collections = activeCollections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    count: collection.knownCount,
  }));
  const allCount = collections.reduce((total, collection) => total + collection.count, 0);

  return [
    send(
      chatId,
      formatQuizSetupCollectionPrompt(),
      buildQuizCollectionKeyboard(collections, allCount),
      true,
    ),
  ];
}

export async function sendCountQuestion(
  client: Client,
  chatId: number,
  userId: string,
  domainId: QuizDomainSelection,
): Promise<TelegramAction[]> {
  const available = await countTermsForQuiz(client, userId, domainId);
  const maxCount = getMaxQuizQuestionCount(available);

  if (maxCount === 0) {
    await clearQuizSetup(client, chatId);
    return [send(chatId, NO_KNOWN_TERMS_FOR_QUIZ_MESSAGE)];
  }

  const defaultCount = Math.min(DEFAULT_TELEGRAM_QUIZ_COUNT, maxCount);
  return [
    send(
      chatId,
      formatQuizSetupCountPrompt(maxCount, defaultCount),
      buildQuizCountKeyboard(maxCount),
      true,
    ),
  ];
}

export async function formatDomainChoiceLabel(
  client: Client,
  userId: string,
  domainId: QuizDomainSelection,
): Promise<string> {
  const stats = await fetchCollectionStats(client, userId, "quiz");
  const activeCollections = stats.filter((collection) => collection.isActive);

  if (domainId === "all") {
    const allCount = activeCollections.reduce(
      (total, collection) => total + collection.knownCount,
      0,
    );
    return `All collections (${allCount})`;
  }

  const collection = activeCollections.find((item) => item.id === domainId);
  return collection?.name ?? "Selected collection";
}
