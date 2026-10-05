import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { QuizQuestion } from "@/lib/quiz/types";
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

  await saveStoredSession(client, chatId, updated);

  return updated;
}

export function hasMoreQuestions(session: ReviewSession): boolean {
  return session.currentIndex < session.questions.length;
}

export function getCurrentQuestion(session: ReviewSession): QuizQuestion | null {
  return session.questions[session.currentIndex] ?? null;
}
