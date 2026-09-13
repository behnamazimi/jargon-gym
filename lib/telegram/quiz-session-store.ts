import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { buildIllustrationQuestions, type IllustrationPick } from "@/lib/quiz/illustration";
import { fetchQuizTermPool, getMaxStudyCount } from "@/lib/study";
import { getPoolStatsForUser } from "@/lib/trace-queue";
import { DEFAULT_TELEGRAM_QUIZ_COUNT } from "./constants";

type Client = SupabaseClient<Database>;

export type QuizDomainSelection = "all" | string;

export { DEFAULT_TELEGRAM_QUIZ_COUNT };

export type ReviewSession = {
  userId: string;
  domainId: QuizDomainSelection;
  termIds: string[];
  /** termId -> illustration MCQ pick, for terms picked at session creation.
   *  Terms not in this map get the regular term-guess MCQ. */
  illustration: Record<string, IllustrationPick>;
  currentIndex: number;
  correctCount: number;
  startedAt: number;
};

type StoredQuizSession = {
  domainId: QuizDomainSelection;
  termIds: string[];
  illustration: Record<string, IllustrationPick>;
  currentIndex: number;
  correctCount: number;
  startedAt: number;
};

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function isIllustrationPick(value: unknown): value is IllustrationPick {
  if (!value || typeof value !== "object") return false;
  const pick = value as IllustrationPick;
  return (
    typeof pick.scenarioText === "string" &&
    Array.isArray(pick.options) &&
    pick.options.every(
      (option) => option && typeof option.id === "string" && typeof option.text === "string",
    ) &&
    typeof pick.correctOptionId === "string"
  );
}

function isIllustrationMap(value: unknown): value is Record<string, IllustrationPick> {
  // Older stored sessions predate this field, so treat it as optional here —
  // the reader below defaults a missing map to {}.
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  return Object.values(value).every(isIllustrationPick);
}

function isStoredSession(value: unknown): value is StoredQuizSession {
  if (!value || typeof value !== "object") return false;
  const session = value as StoredQuizSession;
  return (
    (session.domainId === "all" || typeof session.domainId === "string") &&
    Array.isArray(session.termIds) &&
    session.termIds.every((id) => typeof id === "string") &&
    isIllustrationMap(session.illustration) &&
    typeof session.currentIndex === "number" &&
    typeof session.correctCount === "number" &&
    typeof session.startedAt === "number"
  );
}

export function domainIdsForScope(domainId: QuizDomainSelection | undefined): string[] | "all" {
  if (!domainId || domainId === "all") return "all";
  return [domainId];
}

export async function saveStoredSession(
  client: Client,
  chatId: number,
  session: StoredQuizSession,
): Promise<void> {
  const { error } = await client
    .from("telegram_links")
    .update({
      quiz_session: session as unknown as Json,
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
  domainId: QuizDomainSelection,
): Promise<number> {
  const stats = await getPoolStatsForUser(
    client,
    userId,
    { domainIds: domainIdsForScope(domainId) },
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
  domainId: QuizDomainSelection,
  count: number,
): Promise<ReviewSession> {
  const cards = await fetchQuizTermPool(
    client,
    userId,
    { domainIds: domainIdsForScope(domainId) },
    count,
    "admin",
  );
  const termIds = cards.map((t) => t.id);
  const illustration = Object.fromEntries(await buildIllustrationQuestions(cards, client));

  const session: ReviewSession = {
    userId,
    domainId,
    termIds,
    illustration,
    currentIndex: 0,
    correctCount: 0,
    startedAt: Date.now(),
  };

  if (termIds.length > 0) {
    await saveStoredSession(client, chatId, {
      domainId: session.domainId,
      termIds: session.termIds,
      illustration: session.illustration,
      currentIndex: session.currentIndex,
      correctCount: session.correctCount,
      startedAt: session.startedAt,
    });
  }

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
    domainId: data.quiz_session.domainId,
    termIds: data.quiz_session.termIds,
    illustration: data.quiz_session.illustration ?? {},
    currentIndex: data.quiz_session.currentIndex,
    correctCount: data.quiz_session.correctCount,
    startedAt: data.quiz_session.startedAt,
  };
}
