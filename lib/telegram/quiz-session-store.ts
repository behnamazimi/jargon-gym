import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { buildQuiz } from "@/lib/quiz/build";
import { supabaseDistractorSource } from "@/lib/quiz/distractors-supabase";
import { isQuizQuestion } from "@/lib/quiz/question-schema";
import { fetchQuizTermPool } from "@/lib/quiz/terms";
import type { QuizQuestion } from "@/lib/quiz/types";
import { getMaxStudyCount } from "@/lib/study";
import { getPoolStatsForUser } from "@/lib/trace-queue";
import { DEFAULT_TELEGRAM_QUIZ_COUNT } from "./constants";

type Client = SupabaseClient<Database>;

export type QuizCollectionSelection = "all" | string;

export { DEFAULT_TELEGRAM_QUIZ_COUNT };

export type ReviewSession = {
  userId: string;
  collectionId: QuizCollectionSelection;
  questions: QuizQuestion[];
  currentIndex: number;
  correctCount: number;
  startedAt: number;
};

/** Bump when the stored question shape changes; sessions in any other shape
 *  read as expired. */
const STORED_SESSION_VERSION = 2;

type StoredQuizSession = {
  version: typeof STORED_SESSION_VERSION;
  collectionId: QuizCollectionSelection;
  questions: QuizQuestion[];
  currentIndex: number;
  correctCount: number;
  startedAt: number;
};

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function isStoredSession(value: unknown): value is StoredQuizSession {
  if (!value || typeof value !== "object") return false;
  const session = value as StoredQuizSession;
  return (
    session.version === STORED_SESSION_VERSION &&
    (session.collectionId === "all" || typeof session.collectionId === "string") &&
    Array.isArray(session.questions) &&
    session.questions.every(isQuizQuestion) &&
    typeof session.currentIndex === "number" &&
    typeof session.correctCount === "number" &&
    typeof session.startedAt === "number"
  );
}

export function collectionIdsForScope(
  collectionId: QuizCollectionSelection | undefined,
): string[] | "all" {
  if (!collectionId || collectionId === "all") return "all";
  return [collectionId];
}

export async function saveStoredSession(
  client: Client,
  chatId: number,
  session: ReviewSession,
): Promise<void> {
  const stored: StoredQuizSession = {
    version: STORED_SESSION_VERSION,
    collectionId: session.collectionId,
    questions: session.questions,
    currentIndex: session.currentIndex,
    correctCount: session.correctCount,
    startedAt: session.startedAt,
  };

  const { error } = await client
    .from("telegram_links")
    .update({
      quiz_session: stored as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

export async function deleteSession(client: Client, chatId: number): Promise<void> {
  const { error } = await client
    .from("telegram_links")
    .update({
      quiz_session: null,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

export async function countTermsForQuiz(
  client: Client,
  userId: string,
  collectionId: QuizCollectionSelection,
): Promise<number> {
  const stats = await getPoolStatsForUser(
    client,
    userId,
    { collectionIds: collectionIdsForScope(collectionId) },
    "quiz",
  );
  return stats.total;
}

export function getMaxQuizQuestionCount(availableTermCount: number): number {
  return getMaxStudyCount(availableTermCount);
}

export async function createSession(
  client: Client,
  chatId: number,
  userId: string,
  collectionId: QuizCollectionSelection,
  count: number,
): Promise<ReviewSession> {
  const terms = await fetchQuizTermPool(
    client,
    userId,
    collectionIdsForScope(collectionId),
    count,
    "admin",
  );
  const questions = await buildQuiz(terms, supabaseDistractorSource(client), "telegram");

  const session: ReviewSession = {
    userId,
    collectionId,
    questions,
    currentIndex: 0,
    correctCount: 0,
    startedAt: Date.now(),
  };

  if (questions.length > 0) await saveStoredSession(client, chatId, session);

  return session;
}

export async function getSession(client: Client, chatId: number): Promise<ReviewSession | null> {
  const { data, error } = await client
    .from("telegram_links")
    .select("user_id, quiz_session")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.user_id || !isStoredSession(data.quiz_session)) return null;

  if (Date.now() - data.quiz_session.startedAt > SESSION_TIMEOUT_MS) {
    await deleteSession(client, chatId);
    return null;
  }

  return {
    userId: data.user_id,
    collectionId: data.quiz_session.collectionId,
    questions: data.quiz_session.questions,
    currentIndex: data.quiz_session.currentIndex,
    correctCount: data.quiz_session.correctCount,
    startedAt: data.quiz_session.startedAt,
  };
}
