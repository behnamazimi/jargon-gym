import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getMaxStudyCount } from "@/lib/study";
import type { TelegramAction } from "./actions";
import { DEFAULT_TELEGRAM_REVIEW_COUNT } from "./constants";
import { formatReviewSetupCountPrompt, formatSetupPromptWithAnswer } from "./presentation";
import { resolveReviewCount } from "./review-setup-prompts";
import { startReviewFlashcardSession } from "./review-session-flow";
import { clearReviewSetup, countTermsForReview, loadReviewSetup } from "./session-store";
import { edit, send } from "./transport";

type Client = SupabaseClient<Database>;

export async function handleReviewSetupText(
  client: Client,
  chatId: number,
  userId: string,
  text: string,
): Promise<{ handled: boolean; actions: TelegramAction[] }> {
  const setup = await loadReviewSetup(client, chatId);
  if (!setup || setup.step !== "count" || !setup.domainId) {
    return { handled: false, actions: [] };
  }

  const trimmed = text.trim();
  if (trimmed.startsWith("/")) {
    return { handled: false, actions: [] };
  }

  let count: number;
  const actions: TelegramAction[] = [];

  if (trimmed === "") {
    const available = await countTermsForReview(client, userId, setup.domainId);
    count = Math.min(DEFAULT_TELEGRAM_REVIEW_COUNT, getMaxStudyCount(available));
  } else if (trimmed.toLowerCase() === "all") {
    count = await resolveReviewCount(client, userId, setup.domainId, "all");
  } else {
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed < 1) {
      return {
        handled: true,
        actions: [send(chatId, "Send a valid number, tap a button, or /review to start over.")],
      };
    }

    const maxCount = getMaxStudyCount(await countTermsForReview(client, userId, setup.domainId));

    if (parsed > maxCount) {
      return {
        handled: true,
        actions: [send(chatId, `Maximum for this selection is ${maxCount}. Try again.`)],
      };
    }

    count = parsed;
  }

  const available = await countTermsForReview(client, userId, setup.domainId);
  const maxCount = getMaxStudyCount(available);
  const defaultCount = Math.min(DEFAULT_TELEGRAM_REVIEW_COUNT, maxCount);

  if (setup.promptMessageId) {
    const countLabel =
      trimmed === ""
        ? `${defaultCount} (default)`
        : trimmed.toLowerCase() === "all"
          ? `All (${count})`
          : `${count} card${count === 1 ? "" : "s"}`;

    actions.push(
      edit(
        chatId,
        setup.promptMessageId,
        formatSetupPromptWithAnswer(
          formatReviewSetupCountPrompt(maxCount, defaultCount),
          countLabel,
        ),
      ),
    );
  }

  await clearReviewSetup(client, chatId);
  actions.push(
    ...(await startReviewFlashcardSession(client, chatId, userId, setup.domainId, count)),
  );

  return { handled: true, actions };
}
