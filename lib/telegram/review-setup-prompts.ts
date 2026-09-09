import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchCollectionStats } from "@/lib/jargon/collection-stats";
import { getMaxStudyCount } from "@/lib/study";
import type { TelegramAction } from "./actions";
import { DEFAULT_TELEGRAM_REVIEW_COUNT } from "./constants";
import { NO_REVIEW_TERMS_MESSAGE } from "./copy";
import {
  buildReviewSetupCollectionKeyboard,
  buildReviewSetupCountKeyboard,
  formatReviewSetupCollectionPrompt,
  formatReviewSetupCountPrompt,
} from "./presentation";
import { clearReviewSetup, countTermsForReview, type QuizDomainSelection } from "./session-store";
import { send } from "./transport";

type Client = SupabaseClient<Database>;

export async function resolveReviewCount(
  client: Client,
  userId: string,
  domainId: QuizDomainSelection,
  requestedCount: number | "all",
): Promise<number> {
  const available = await countTermsForReview(client, userId, domainId);
  const maxCount = getMaxStudyCount(available);
  if (maxCount === 0) return 0;
  if (requestedCount === "all") return maxCount;
  return Math.min(requestedCount, maxCount);
}

export async function sendReviewCollectionQuestion(
  client: Client,
  chatId: number,
  userId: string,
): Promise<TelegramAction[]> {
  const stats = await fetchCollectionStats(client, userId, "review");
  const activeCollections = stats.filter((collection) => collection.isActive);

  if (activeCollections.length === 0) {
    await clearReviewSetup(client, chatId);
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
    count: collection.totalCount,
  }));
  const allCount = collections.reduce((total, collection) => total + collection.count, 0);

  return [
    send(
      chatId,
      formatReviewSetupCollectionPrompt(),
      buildReviewSetupCollectionKeyboard(collections, allCount),
      true,
    ),
  ];
}

export async function sendReviewCountQuestion(
  client: Client,
  chatId: number,
  userId: string,
  domainId: QuizDomainSelection,
): Promise<TelegramAction[]> {
  const available = await countTermsForReview(client, userId, domainId);
  const maxCount = getMaxStudyCount(available);

  if (maxCount === 0) {
    await clearReviewSetup(client, chatId);
    return [send(chatId, NO_REVIEW_TERMS_MESSAGE)];
  }

  const defaultCount = Math.min(DEFAULT_TELEGRAM_REVIEW_COUNT, maxCount);
  return [
    send(
      chatId,
      formatReviewSetupCountPrompt(maxCount, defaultCount),
      buildReviewSetupCountKeyboard(maxCount),
      true,
    ),
  ];
}

export async function formatReviewDomainChoiceLabel(
  client: Client,
  userId: string,
  domainId: QuizDomainSelection,
): Promise<string> {
  const stats = await fetchCollectionStats(client, userId, "review");
  const activeCollections = stats.filter((collection) => collection.isActive);

  if (domainId === "all") {
    const allCount = activeCollections.reduce(
      (total, collection) => total + collection.totalCount,
      0,
    );
    return `All collections (${allCount})`;
  }

  const collection = activeCollections.find((item) => item.id === domainId);
  return collection?.name ?? "Selected collection";
}
