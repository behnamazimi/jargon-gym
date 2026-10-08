import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchCollectionStats } from "@/lib/mastery/collection-stats";
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
  type QuizCollectionSelection,
} from "./session-store";
import { send } from "./transport";

type Client = SupabaseClient<Database>;

export async function resolveQuizCount(
  client: Client,
  userId: string,
  collectionId: QuizCollectionSelection,
  requestedCount: number | "all",
): Promise<number> {
  const available = await countTermsForQuiz(client, userId, collectionId);
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
        "You have no active collections. Add or resume one in your Library in the app first.",
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
  collectionId: QuizCollectionSelection,
): Promise<TelegramAction[]> {
  const available = await countTermsForQuiz(client, userId, collectionId);
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

export async function formatCollectionChoiceLabel(
  client: Client,
  userId: string,
  collectionId: QuizCollectionSelection,
): Promise<string> {
  const stats = await fetchCollectionStats(client, userId, "quiz");
  const activeCollections = stats.filter((collection) => collection.isActive);

  if (collectionId === "all") {
    const allCount = activeCollections.reduce(
      (total, collection) => total + collection.knownCount,
      0,
    );
    return `All collections (${allCount})`;
  }

  const collection = activeCollections.find((item) => item.id === collectionId);
  return collection?.name ?? "Selected collection";
}
