import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { setTermMarkedKnownForUser } from "@/lib/jargon/known-state";
import { applyReviewGrade } from "@/lib/jargon/review-outcome";
import type { ReviewGrade } from "@/lib/trace";
import type { TelegramAction } from "./actions";
import { formatReviewRated, formatReviewRevealed } from "./presentation";
import { buildCurrentCardActions, buildReviewSummaryActions } from "./review-session-flow";
import {
  getCurrentReviewTerm,
  getReviewSession,
  hasMoreReviewTerms,
  recordReviewRating,
  skipCurrentReviewTerm,
} from "./session-store";
import { edit, send } from "./transport";

type Client = SupabaseClient<Database>;

/** "Again / Hard / Good / Easy": records the FSRS-5 grade, advances —
 *  the same four grades and update the web Review page's buttons record. */
export async function handleReviewRate(
  client: Client,
  chatId: number,
  messageId: number,
  sessionIndex: number,
  grade: ReviewGrade,
): Promise<TelegramAction[]> {
  const session = await getReviewSession(client, chatId);
  if (!session) {
    return [send(chatId, "Your review session has expired. Start a new one with /review")];
  }

  if (sessionIndex !== session.currentIndex || !session.revealed) {
    return [];
  }

  const currentTerm = await getCurrentReviewTerm(client, session);
  if (!currentTerm) return [];

  await applyReviewGrade(client, session.userId, {
    termId: currentTerm.id,
    grade,
    mode: "admin",
  });

  const updatedSession = await recordReviewRating(client, chatId, session, grade);

  const actions: TelegramAction[] = [
    edit(
      chatId,
      messageId,
      formatReviewRated(currentTerm, sessionIndex, session.terms.length, grade),
    ),
  ];

  if (hasMoreReviewTerms(updatedSession)) {
    actions.push({ type: "pause", chatId, ms: 1200 });
    actions.push(...(await buildCurrentCardActions(client, chatId)));
  } else {
    actions.push({ type: "pause", chatId, ms: 800 });
    actions.push(...(await buildReviewSummaryActions(client, chatId)));
  }

  return actions;
}

/** "I already know this" on a first-exposure card: marks it known (a
 *  separate, user-set signal from TRACE's earned state — see
 *  review_state.marked_known_at) and advances without recording a grade. */
export async function handleReviewMarkKnown(
  client: Client,
  chatId: number,
  messageId: number,
  sessionIndex: number,
): Promise<TelegramAction[]> {
  const session = await getReviewSession(client, chatId);
  if (!session) {
    return [send(chatId, "Your review session has expired. Start a new one with /review")];
  }

  if (sessionIndex !== session.currentIndex || !session.revealed) {
    return [];
  }

  const currentTerm = await getCurrentReviewTerm(client, session);
  if (!currentTerm) return [];

  await setTermMarkedKnownForUser(client, session.userId, currentTerm.id, true);

  const updatedSession = await skipCurrentReviewTerm(client, chatId, session);

  const actions: TelegramAction[] = [
    edit(
      chatId,
      messageId,
      `${formatReviewRevealed(currentTerm, sessionIndex, session.terms.length)}\n\n<b>Marked known.</b> You won't see this term again unless you add it back to learning.`,
    ),
  ];

  if (hasMoreReviewTerms(updatedSession)) {
    actions.push({ type: "pause", chatId, ms: 1000 });
    actions.push(...(await buildCurrentCardActions(client, chatId)));
  } else {
    actions.push({ type: "pause", chatId, ms: 800 });
    actions.push(...(await buildReviewSummaryActions(client, chatId)));
  }

  return actions;
}
