import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import { fetchTermCardForUser } from "@/lib/trace-queue";
import { saveStoredSession, type ReviewSession } from "./quiz-session-store";

type Client = SupabaseClient<Database>;

export async function updateSession(
  client: Client,
  chatId: number,
  session: ReviewSession,
  wasCorrect: boolean,
): Promise<ReviewSession> {
  const updated: ReviewSession = {
    ...session,
    currentIndex: session.currentIndex + 1,
    correctCount: wasCorrect ? session.correctCount + 1 : session.correctCount,
  };

  await saveStoredSession(client, chatId, {
    domainId: updated.domainId,
    termIds: updated.termIds,
    exampleJudgment: updated.exampleJudgment,
    currentIndex: updated.currentIndex,
    correctCount: updated.correctCount,
    startedAt: updated.startedAt,
  });

  return updated;
}

export function hasMoreQuestions(session: ReviewSession): boolean {
  return session.currentIndex < session.termIds.length;
}

export async function getCurrentTerm(
  client: Client,
  session: ReviewSession,
): Promise<TermCard | null> {
  if (session.currentIndex >= session.termIds.length) return null;
  const termId = session.termIds[session.currentIndex];
  return fetchTermCardForUser(client, session.userId, termId);
}
