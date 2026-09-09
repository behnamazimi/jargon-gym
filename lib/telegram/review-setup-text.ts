import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getMaxStudyCount } from "@/lib/study";
import type { TelegramAction } from "./actions";
import { DEFAULT_TELEGRAM_REVIEW_COUNT } from "./constants";
import { formatReviewSetupCountPrompt, formatSetupPromptWithAnswer } from "./presentation";
import { resolveReviewCount } from "./review-setup-prompts";
import { startReviewFlashcardSession } from "./review-session-flow";
import {
  clearReviewSetup,
  countTermsForReview,
  loadReviewSetup,
  type QuizDomainSelection,
} from "./session-store";
import { edit, send } from "./transport";

type Client = SupabaseClient<Database>;

type ReviewSetupCountResult = { ok: true; count: number } | { ok: false; message: string };

async function resolveReviewSetupTextCount(
  client: Client,
  userId: string,
  domainId: QuizDomainSelection,
  trimmed: string,
): Promise<ReviewSetupCountResult> {
  if (trimmed === "") {
    const available = await countTermsForReview(client, userId, domainId);
    return {
      ok: true,
      count: Math.min(DEFAULT_TELEGRAM_REVIEW_COUNT, getMaxStudyCount(available)),
    };
  }

  if (trimmed.toLowerCase() === "all") {
    return { ok: true, count: await resolveReviewCount(client, userId, domainId, "all") };
  }

  const parsed = parseInt(trimmed, 10);
  if (isNaN(parsed) || parsed < 1) {
    return {
      ok: false,
      message: "Send a valid number, tap a button, or /review to start over.",
    };
  }

  const maxCount = getMaxStudyCount(await countTermsForReview(client, userId, domainId));
  if (parsed > maxCount) {
    return { ok: false, message: `Maximum for this selection is ${maxCount}. Try again.` };
  }

  return { ok: true, count: parsed };
}

function formatReviewSetupTextCountLabel(
  trimmed: string,
  count: number,
  defaultCount: number,
): string {
  if (trimmed === "") return `${defaultCount} (default)`;
  if (trimmed.toLowerCase() === "all") return `All (${count})`;
  return `${count} card${count === 1 ? "" : "s"}`;
}

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

  const domainId = setup.domainId;
  const resolved = await resolveReviewSetupTextCount(client, userId, domainId, trimmed);
  if (!resolved.ok) {
    return { handled: true, actions: [send(chatId, resolved.message)] };
  }
  const { count } = resolved;

  const actions: TelegramAction[] = [];
  const available = await countTermsForReview(client, userId, domainId);
  const maxCount = getMaxStudyCount(available);
  const defaultCount = Math.min(DEFAULT_TELEGRAM_REVIEW_COUNT, maxCount);

  if (setup.promptMessageId) {
    const countLabel = formatReviewSetupTextCountLabel(trimmed, count, defaultCount);
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
  actions.push(...(await startReviewFlashcardSession(client, chatId, userId, domainId, count)));

  return { handled: true, actions };
}
