import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import { fetchStudyTermPool, getMaxStudyCount, type TermPoolStatus } from "@/lib/study";
import { getReviewPoolStatsForUser, fetchTermCardForUser } from "@/lib/smart-queue";
import { DEFAULT_TELEGRAM_QUIZ_COUNT } from "./constants";

type Client = SupabaseClient<Database>;

export type ReviewStatus = TermPoolStatus;
export type QuizDomainSelection = "all" | string;
type QuizSetupStep = "status" | "collection" | "count";

export { DEFAULT_TELEGRAM_QUIZ_COUNT };

export type QuizSetupState = {
  step: QuizSetupStep;
  status?: ReviewStatus;
  domainId?: QuizDomainSelection;
  promptMessageId?: number;
  startedAt: number;
};

export type ReviewSession = {
  userId: string;
  status: ReviewStatus;
  domainId: QuizDomainSelection;
  termIds: string[];
  currentIndex: number;
  correctCount: number;
  startedAt: number;
};

type StoredQuizSession = {
  status: ReviewStatus;
  domainId: QuizDomainSelection;
  termIds: string[];
  currentIndex: number;
  correctCount: number;
  startedAt: number;
};

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const SETUP_TIMEOUT_MS = 30 * 60 * 1000;

function isQuizSetupState(value: unknown): value is QuizSetupState {
  if (!value || typeof value !== "object") return false;
  const setup = value as QuizSetupState;
  return (
    (setup.step === "status" || setup.step === "collection" || setup.step === "count") &&
    typeof setup.startedAt === "number" &&
    (setup.status === undefined || setup.status === "known" || setup.status === "unknown") &&
    (setup.domainId === undefined || setup.domainId === "all" || typeof setup.domainId === "string")
  );
}

function isStoredSession(value: unknown): value is StoredQuizSession {
  if (!value || typeof value !== "object") return false;
  const session = value as StoredQuizSession;
  return (
    (session.status === "known" || session.status === "unknown") &&
    (session.domainId === "all" || typeof session.domainId === "string") &&
    Array.isArray(session.termIds) &&
    session.termIds.every((id) => typeof id === "string") &&
    typeof session.currentIndex === "number" &&
    typeof session.correctCount === "number" &&
    typeof session.startedAt === "number"
  );
}

function domainIdsForScope(domainId: QuizDomainSelection | undefined): string[] | "all" {
  if (!domainId || domainId === "all") return "all";
  return [domainId];
}

export async function loadQuizSetup(
  client: Client,
  chatId: number,
): Promise<QuizSetupState | null> {
  const { data, error } = await client
    .from("telegram_links")
    .select("quiz_setup")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  if (!isQuizSetupState(data?.quiz_setup)) return null;

  if (Date.now() - data.quiz_setup.startedAt > SETUP_TIMEOUT_MS) {
    await clearQuizSetup(client, chatId);
    return null;
  }

  return data.quiz_setup;
}

export async function saveQuizSetup(
  client: Client,
  chatId: number,
  setup: QuizSetupState,
): Promise<void> {
  const { error } = await client
    .from("telegram_links")
    .update({
      quiz_setup: setup as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

export async function clearQuizSetup(client: Client, chatId: number): Promise<void> {
  const { error } = await client
    .from("telegram_links")
    .update({
      quiz_setup: null,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

async function saveStoredSession(
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
  status: ReviewStatus,
  domainId: QuizDomainSelection,
): Promise<number> {
  const stats = await getReviewPoolStatsForUser(
    client,
    userId,
    { domainIds: domainIdsForScope(domainId) },
    status,
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
  status: ReviewStatus,
  domainId: QuizDomainSelection,
  count: number,
): Promise<ReviewSession> {
  const terms = await fetchStudyTermPool(
    client,
    userId,
    { domainIds: domainIdsForScope(domainId) },
    status,
    count,
    "admin",
  );
  const termIds = terms.map((t) => t.id);

  const session: ReviewSession = {
    userId,
    status,
    domainId,
    termIds,
    currentIndex: 0,
    correctCount: 0,
    startedAt: Date.now(),
  };

  if (termIds.length > 0) {
    await saveStoredSession(client, chatId, {
      status: session.status,
      domainId: session.domainId,
      termIds: session.termIds,
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
    status: data.quiz_session.status,
    domainId: data.quiz_session.domainId,
    termIds: data.quiz_session.termIds,
    currentIndex: data.quiz_session.currentIndex,
    correctCount: data.quiz_session.correctCount,
    startedAt: data.quiz_session.startedAt,
  };
}

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
    status: updated.status,
    domainId: updated.domainId,
    termIds: updated.termIds,
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

export async function clearTelegramInteractionState(client: Client, chatId: number): Promise<void> {
  try {
    await clearQuizSetup(client, chatId);
  } catch (error) {
    console.error("Failed to clear quiz setup:", error);
  }
  try {
    await deleteSession(client, chatId);
  } catch (error) {
    console.error("Failed to clear quiz session:", error);
  }
}
