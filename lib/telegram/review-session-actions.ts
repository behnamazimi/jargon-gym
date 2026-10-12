import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/terms/term-card";
import { fetchTermCardForUser } from "@/lib/trace-queue";
import { AGAIN, GOOD, LEARNING_STEP_MAX_RETRIES } from "@/lib/trace";
import type { ReviewGrade } from "@/lib/trace";
import { saveStoredReviewSession, type TelegramReviewSession } from "./review-session-store";

type Client = SupabaseClient<Database>;

/** A missed term is asked again after about this many other cards. */
export const RETRY_AFTER_CARDS_TELEGRAM = 3;

export async function markReviewRevealed(
  client: Client,
  chatId: number,
  session: TelegramReviewSession,
): Promise<TelegramReviewSession> {
  const updated: TelegramReviewSession = { ...session, revealed: true };

  await saveStoredReviewSession(client, chatId, {
    collectionId: updated.collectionId,
    terms: updated.terms,
    currentIndex: updated.currentIndex,
    revealed: updated.revealed,
    retainedCount: updated.retainedCount,
    startedAt: updated.startedAt,
  });

  return updated;
}

export async function recordReviewRating(
  client: Client,
  chatId: number,
  session: TelegramReviewSession,
  grade: ReviewGrade,
): Promise<TelegramReviewSession> {
  const current = session.terms[session.currentIndex];
  const retry = current?.retry ?? 0;
  // A missed term is asked again, up to LEARNING_STEP_MAX_RETRIES times.
  const terms =
    current && grade === AGAIN && retry < LEARNING_STEP_MAX_RETRIES
      ? withRetry(session.terms, session.currentIndex, {
          ...current,
          isNewToUser: false,
          retry: retry + 1,
        })
      : session.terms;
  const updated: TelegramReviewSession = {
    ...session,
    terms,
    currentIndex: session.currentIndex + 1,
    revealed: false,
    // Only the first showing of a term counts as retained.
    retainedCount: grade >= GOOD && retry === 0 ? session.retainedCount + 1 : session.retainedCount,
  };

  await saveStoredReviewSession(client, chatId, {
    collectionId: updated.collectionId,
    terms: updated.terms,
    currentIndex: updated.currentIndex,
    revealed: updated.revealed,
    retainedCount: updated.retainedCount,
    startedAt: updated.startedAt,
  });

  return updated;
}

function withRetry(
  terms: TelegramReviewSession["terms"],
  currentIndex: number,
  retryTerm: TelegramReviewSession["terms"][number],
): TelegramReviewSession["terms"] {
  const at = Math.min(currentIndex + 1 + RETRY_AFTER_CARDS_TELEGRAM, terms.length);
  return [...terms.slice(0, at), retryTerm, ...terms.slice(at)];
}

/** Advance past the current term without recording an FSRS-5 grade — used
 *  when the user marks it known instead of rating it. Doesn't touch
 *  retainedCount, since no answer was given. */
export async function skipCurrentReviewTerm(
  client: Client,
  chatId: number,
  session: TelegramReviewSession,
): Promise<TelegramReviewSession> {
  const updated: TelegramReviewSession = {
    ...session,
    currentIndex: session.currentIndex + 1,
    revealed: false,
  };

  await saveStoredReviewSession(client, chatId, {
    collectionId: updated.collectionId,
    terms: updated.terms,
    currentIndex: updated.currentIndex,
    revealed: updated.revealed,
    retainedCount: updated.retainedCount,
    startedAt: updated.startedAt,
  });

  return updated;
}

export function hasMoreReviewTerms(session: TelegramReviewSession): boolean {
  return session.currentIndex < session.terms.length;
}

export async function getCurrentReviewTerm(
  client: Client,
  session: TelegramReviewSession,
): Promise<TermCard | null> {
  if (session.currentIndex >= session.terms.length) return null;
  const sessionTerm = session.terms[session.currentIndex];
  const card = await fetchTermCardForUser(client, session.userId, sessionTerm.id);
  if (!card) return null;
  return { ...card, isNewToUser: sessionTerm.isNewToUser };
}
