import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import { fetchTermCardForUser } from "@/lib/trace-queue";
import { GOOD } from "@/lib/trace";
import type { ReviewGrade } from "@/lib/trace";
import { saveStoredReviewSession, type TelegramReviewSession } from "./review-session-store";

type Client = SupabaseClient<Database>;

export async function markReviewRevealed(
  client: Client,
  chatId: number,
  session: TelegramReviewSession,
): Promise<TelegramReviewSession> {
  const updated: TelegramReviewSession = { ...session, revealed: true };

  await saveStoredReviewSession(client, chatId, {
    domainId: updated.domainId,
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
  const updated: TelegramReviewSession = {
    ...session,
    currentIndex: session.currentIndex + 1,
    revealed: false,
    retainedCount: grade >= GOOD ? session.retainedCount + 1 : session.retainedCount,
  };

  await saveStoredReviewSession(client, chatId, {
    domainId: updated.domainId,
    terms: updated.terms,
    currentIndex: updated.currentIndex,
    revealed: updated.revealed,
    retainedCount: updated.retainedCount,
    startedAt: updated.startedAt,
  });

  return updated;
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
    domainId: updated.domainId,
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
