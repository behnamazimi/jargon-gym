import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { recordReveal } from "@/lib/jargon/review-outcome";
import type { TelegramAction } from "./actions";
import { NO_REVIEW_TERMS_MESSAGE, REVIEW_REVEAL_FAILED_SUFFIX } from "./copy";
import {
  buildReviewRateKeyboard,
  buildReviewRevealKeyboard,
  formatReviewPrompt,
  formatReviewRevealed,
  formatReviewSessionSummary,
} from "./presentation";
import {
  createReviewSession,
  deleteReviewSession,
  getCurrentReviewTerm,
  getReviewSession,
  markReviewRevealed,
  type QuizDomainSelection,
  type TelegramReviewSession,
} from "./session-store";
import { edit, send } from "./transport";

type Client = SupabaseClient<Database>;

/** `knownSession` lets a caller that just mutated the session (rate/skip)
 *  pass it straight through instead of re-reading it back from storage. */
export async function buildCurrentCardActions(
  client: Client,
  chatId: number,
  knownSession?: TelegramReviewSession,
): Promise<TelegramAction[]> {
  const session = knownSession ?? (await getReviewSession(client, chatId));
  if (!session) {
    return [send(chatId, "Your review session has expired. Start a new one with /review")];
  }

  const currentTerm = await getCurrentReviewTerm(client, session);
  if (!currentTerm) {
    return buildReviewSummaryActions(client, chatId, session);
  }

  return [
    send(
      chatId,
      formatReviewPrompt(currentTerm, session.currentIndex, session.terms.length),
      buildReviewRevealKeyboard(session.currentIndex),
      true,
    ),
  ];
}

export async function buildReviewSummaryActions(
  client: Client,
  chatId: number,
  knownSession?: TelegramReviewSession,
): Promise<TelegramAction[]> {
  const session = knownSession ?? (await getReviewSession(client, chatId));
  if (!session) return [];

  const message = formatReviewSessionSummary(session.terms.length, session.retainedCount);
  await deleteReviewSession(client, chatId);
  return [send(chatId, message)];
}

export async function startReviewFlashcardSession(
  client: Client,
  chatId: number,
  userId: string,
  domainId: QuizDomainSelection,
  count: number,
): Promise<TelegramAction[]> {
  const session = await createReviewSession(client, chatId, userId, domainId, count);

  if (session.terms.length === 0) {
    await deleteReviewSession(client, chatId);
    return [send(chatId, NO_REVIEW_TERMS_MESSAGE)];
  }

  return buildCurrentCardActions(client, chatId, session);
}

/** "Reveal": records read (only now, not on delivery) and swaps the button row to rating. */
export async function handleReviewReveal(
  client: Client,
  chatId: number,
  messageId: number,
  sessionIndex: number,
): Promise<TelegramAction[]> {
  const session = await getReviewSession(client, chatId);
  if (!session) {
    return [send(chatId, "Your review session has expired. Start a new one with /review")];
  }

  if (sessionIndex !== session.currentIndex || session.revealed) {
    return [];
  }

  const currentTerm = await getCurrentReviewTerm(client, session);
  if (!currentTerm) return [];

  try {
    await recordReveal(client, session.userId, currentTerm.id, "admin");
  } catch (error) {
    console.error("handleReviewReveal: failed to record reveal event", {
      userId: session.userId,
      termId: currentTerm.id,
      error,
    });
    // Session state is untouched (still not revealed) so the same Reveal button can be retried.
    return [
      edit(
        chatId,
        messageId,
        `${formatReviewPrompt(currentTerm, session.currentIndex, session.terms.length)}${REVIEW_REVEAL_FAILED_SUFFIX}`,
        buildReviewRevealKeyboard(session.currentIndex),
      ),
    ];
  }

  const updatedSession = await markReviewRevealed(client, chatId, session);

  return [
    edit(
      chatId,
      messageId,
      formatReviewRevealed(currentTerm, updatedSession.currentIndex, updatedSession.terms.length),
      buildReviewRateKeyboard(updatedSession.currentIndex, currentTerm.isNewToUser),
    ),
  ];
}

export { handleReviewRate, handleReviewMarkKnown } from "./review-rate-flow";
