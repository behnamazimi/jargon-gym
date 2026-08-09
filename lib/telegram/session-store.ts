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
  status: ReviewStatus,
  domainId: QuizDomainSelection,
  count: number,
): Promise<ReviewSession> {
  const { cards } = await fetchStudyTermPool(
    client,
    userId,
    { domainIds: domainIdsForScope(domainId) },
    status,
    count,
    "admin",
    "quiz",
  );
  const termIds = cards.map((t) => t.id);

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

// --- /review flashcard-style setup wizard + session state ---

export type ReviewSetupState = QuizSetupState;

export type TelegramReviewSession = {
  userId: string;
  status: ReviewStatus;
  domainId: QuizDomainSelection;
  termIds: string[];
  currentIndex: number;
  revealed: boolean;
  positiveCount: number;
  startedAt: number;
};

type StoredReviewSession = {
  status: ReviewStatus;
  domainId: QuizDomainSelection;
  termIds: string[];
  currentIndex: number;
  revealed: boolean;
  positiveCount: number;
  startedAt: number;
};

function isStoredReviewSession(value: unknown): value is StoredReviewSession {
  if (!value || typeof value !== "object") return false;
  const session = value as StoredReviewSession;
  return (
    (session.status === "known" || session.status === "unknown") &&
    (session.domainId === "all" || typeof session.domainId === "string") &&
    Array.isArray(session.termIds) &&
    session.termIds.every((id) => typeof id === "string") &&
    typeof session.currentIndex === "number" &&
    typeof session.revealed === "boolean" &&
    typeof session.positiveCount === "number" &&
    typeof session.startedAt === "number"
  );
}

export async function loadReviewSetup(
  client: Client,
  chatId: number,
): Promise<ReviewSetupState | null> {
  const { data, error } = await client
    .from("telegram_links")
    .select("review_setup")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  if (!isQuizSetupState(data?.review_setup)) return null;

  if (Date.now() - data.review_setup.startedAt > SETUP_TIMEOUT_MS) {
    await clearReviewSetup(client, chatId);
    return null;
  }

  return data.review_setup;
}

export async function saveReviewSetup(
  client: Client,
  chatId: number,
  setup: ReviewSetupState,
): Promise<void> {
  const { error } = await client
    .from("telegram_links")
    .update({
      review_setup: setup as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

export async function clearReviewSetup(client: Client, chatId: number): Promise<void> {
  const { error } = await client
    .from("telegram_links")
    .update({
      review_setup: null,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

async function saveStoredReviewSession(
  client: Client,
  chatId: number,
  session: StoredReviewSession,
): Promise<void> {
  const { error } = await client
    .from("telegram_links")
    .update({
      review_session: session as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

export async function deleteReviewSession(client: Client, chatId: number): Promise<void> {
  const { error } = await client
    .from("telegram_links")
    .update({
      review_session: null,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

export async function countTermsForReview(
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
    "review",
  );
  return stats.total;
}

export async function createReviewSession(
  client: Client,
  chatId: number,
  userId: string,
  status: ReviewStatus,
  domainId: QuizDomainSelection,
  count: number,
): Promise<TelegramReviewSession> {
  const { cards } = await fetchStudyTermPool(
    client,
    userId,
    { domainIds: domainIdsForScope(domainId) },
    status,
    count,
    "admin",
    "review",
  );
  const termIds = cards.map((t) => t.id);

  const session: TelegramReviewSession = {
    userId,
    status,
    domainId,
    termIds,
    currentIndex: 0,
    revealed: false,
    positiveCount: 0,
    startedAt: Date.now(),
  };

  if (termIds.length > 0) {
    await saveStoredReviewSession(client, chatId, {
      status: session.status,
      domainId: session.domainId,
      termIds: session.termIds,
      currentIndex: session.currentIndex,
      revealed: session.revealed,
      positiveCount: session.positiveCount,
      startedAt: session.startedAt,
    });
  }

  return session;
}

export async function getReviewSession(
  client: Client,
  chatId: number,
): Promise<TelegramReviewSession | null> {
  const { data, error } = await client
    .from("telegram_links")
    .select("user_id, review_session")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.user_id || !isStoredReviewSession(data.review_session)) return null;

  if (Date.now() - data.review_session.startedAt > SESSION_TIMEOUT_MS) {
    await deleteReviewSession(client, chatId);
    return null;
  }

  return {
    userId: data.user_id,
    status: data.review_session.status,
    domainId: data.review_session.domainId,
    termIds: data.review_session.termIds,
    currentIndex: data.review_session.currentIndex,
    revealed: data.review_session.revealed,
    positiveCount: data.review_session.positiveCount,
    startedAt: data.review_session.startedAt,
  };
}

export async function markReviewRevealed(
  client: Client,
  chatId: number,
  session: TelegramReviewSession,
): Promise<TelegramReviewSession> {
  const updated: TelegramReviewSession = { ...session, revealed: true };

  await saveStoredReviewSession(client, chatId, {
    status: updated.status,
    domainId: updated.domainId,
    termIds: updated.termIds,
    currentIndex: updated.currentIndex,
    revealed: updated.revealed,
    positiveCount: updated.positiveCount,
    startedAt: updated.startedAt,
  });

  return updated;
}

export async function recordReviewRating(
  client: Client,
  chatId: number,
  session: TelegramReviewSession,
  known: boolean,
): Promise<TelegramReviewSession> {
  const updated: TelegramReviewSession = {
    ...session,
    currentIndex: session.currentIndex + 1,
    revealed: false,
    positiveCount: known ? session.positiveCount + 1 : session.positiveCount,
  };

  await saveStoredReviewSession(client, chatId, {
    status: updated.status,
    domainId: updated.domainId,
    termIds: updated.termIds,
    currentIndex: updated.currentIndex,
    revealed: updated.revealed,
    positiveCount: updated.positiveCount,
    startedAt: updated.startedAt,
  });

  return updated;
}

export function hasMoreReviewTerms(session: TelegramReviewSession): boolean {
  return session.currentIndex < session.termIds.length;
}

export async function getCurrentReviewTerm(
  client: Client,
  session: TelegramReviewSession,
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
  try {
    await clearReviewSetup(client, chatId);
  } catch (error) {
    console.error("Failed to clear review setup:", error);
  }
  try {
    await deleteReviewSession(client, chatId);
  } catch (error) {
    console.error("Failed to clear review session:", error);
  }
}
