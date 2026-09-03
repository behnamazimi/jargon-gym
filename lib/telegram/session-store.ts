import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import {
  assignExampleJudgmentQuestions,
  type ExampleJudgmentPick,
} from "@/lib/quiz/example-judgment";
import { fetchQuizTermPool, fetchStudyTermPool, getMaxStudyCount } from "@/lib/study";
import { getPoolStatsForUser, fetchTermCardForUser } from "@/lib/trace-queue";
import { fetchTraceCandidatesForUser } from "@/lib/trace-queue/repository";
import { computeTraceSnapshot, GOOD } from "@/lib/trace";
import type { KnownLabel, ReviewGrade } from "@/lib/trace";
import { DEFAULT_TELEGRAM_QUIZ_COUNT } from "./constants";

type Client = SupabaseClient<Database>;

export type QuizDomainSelection = "all" | string;
type QuizSetupStep = "collection" | "count";

export { DEFAULT_TELEGRAM_QUIZ_COUNT };

export type QuizSetupState = {
  step: QuizSetupStep;
  domainId?: QuizDomainSelection;
  promptMessageId?: number;
  startedAt: number;
};

export type ReviewSession = {
  userId: string;
  domainId: QuizDomainSelection;
  termIds: string[];
  /** termId -> example-judgment true/false question, for terms picked at
   *  session creation. Terms not in this map get the regular term-guess MCQ. */
  exampleJudgment: Record<string, ExampleJudgmentPick>;
  currentIndex: number;
  correctCount: number;
  startedAt: number;
};

type StoredQuizSession = {
  domainId: QuizDomainSelection;
  termIds: string[];
  exampleJudgment: Record<string, ExampleJudgmentPick>;
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
    (setup.step === "collection" || setup.step === "count") &&
    typeof setup.startedAt === "number" &&
    (setup.domainId === undefined || setup.domainId === "all" || typeof setup.domainId === "string")
  );
}

function isExampleJudgmentPick(value: unknown): value is ExampleJudgmentPick {
  if (!value || typeof value !== "object") return false;
  const pick = value as ExampleJudgmentPick;
  return typeof pick.text === "string" && typeof pick.correctAnswer === "boolean";
}

function isExampleJudgmentMap(value: unknown): value is Record<string, ExampleJudgmentPick> {
  // Older stored sessions predate this field, so treat it as optional here —
  // the reader below defaults a missing map to {}.
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  return Object.values(value).every(isExampleJudgmentPick);
}

function isStoredSession(value: unknown): value is StoredQuizSession {
  if (!value || typeof value !== "object") return false;
  const session = value as StoredQuizSession;
  return (
    (session.domainId === "all" || typeof session.domainId === "string") &&
    Array.isArray(session.termIds) &&
    session.termIds.every((id) => typeof id === "string") &&
    isExampleJudgmentMap(session.exampleJudgment) &&
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
  const exampleJudgment = Object.fromEntries(assignExampleJudgmentQuestions(cards));

  const session: ReviewSession = {
    userId,
    domainId,
    termIds,
    exampleJudgment,
    currentIndex: 0,
    correctCount: 0,
    startedAt: Date.now(),
  };

  if (termIds.length > 0) {
    await saveStoredSession(client, chatId, {
      domainId: session.domainId,
      termIds: session.termIds,
      exampleJudgment: session.exampleJudgment,
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
    exampleJudgment: data.quiz_session.exampleJudgment ?? {},
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

// --- /review flashcard-style setup wizard + session state ---

type ReviewSetupStep = "collection" | "count";

export type ReviewSetupState = {
  step: ReviewSetupStep;
  domainId?: QuizDomainSelection;
  promptMessageId?: number;
  startedAt: number;
};

/** One drawn term plus its known-label snapshot at session-build time —
 *  a read-only label derived live from Mastery_adjusted (lib/trace), not a
 *  stored pool. Not yet rendered anywhere; kept for the presentation
 *  fast-follow that gives Telegram Review real 4-point grading. */
type ReviewSessionTerm = { id: string; status: KnownLabel };

export type TelegramReviewSession = {
  userId: string;
  domainId: QuizDomainSelection;
  terms: ReviewSessionTerm[];
  currentIndex: number;
  revealed: boolean;
  /** Grades of Good or Easy (lib/trace's GOOD threshold) — same "retained"
   *  definition the web Review summary uses. */
  retainedCount: number;
  startedAt: number;
};

type StoredReviewSession = {
  domainId: QuizDomainSelection;
  terms: ReviewSessionTerm[];
  currentIndex: number;
  revealed: boolean;
  retainedCount: number;
  startedAt: number;
};

function isReviewSetupState(value: unknown): value is ReviewSetupState {
  if (!value || typeof value !== "object") return false;
  const setup = value as ReviewSetupState;
  return (
    (setup.step === "collection" || setup.step === "count") &&
    typeof setup.startedAt === "number" &&
    (setup.domainId === undefined || setup.domainId === "all" || typeof setup.domainId === "string")
  );
}

function isReviewSessionTerm(value: unknown): value is ReviewSessionTerm {
  if (!value || typeof value !== "object") return false;
  const term = value as ReviewSessionTerm;
  return (
    typeof term.id === "string" &&
    (term.status === "known" || term.status === "learning" || term.status === "unknown")
  );
}

function isStoredReviewSession(value: unknown): value is StoredReviewSession {
  if (!value || typeof value !== "object") return false;
  const session = value as StoredReviewSession;
  return (
    (session.domainId === "all" || typeof session.domainId === "string") &&
    Array.isArray(session.terms) &&
    session.terms.every(isReviewSessionTerm) &&
    typeof session.currentIndex === "number" &&
    typeof session.revealed === "boolean" &&
    typeof session.retainedCount === "number" &&
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
  if (!isReviewSetupState(data?.review_setup)) return null;

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
  domainId: QuizDomainSelection,
): Promise<number> {
  const stats = await getPoolStatsForUser(
    client,
    userId,
    { domainIds: domainIdsForScope(domainId) },
    "review",
  );
  return stats.total;
}

export async function createReviewSession(
  client: Client,
  chatId: number,
  userId: string,
  domainId: QuizDomainSelection,
  count: number,
): Promise<TelegramReviewSession> {
  const scope = { domainIds: domainIdsForScope(domainId) };
  const [cards, candidates] = await Promise.all([
    fetchStudyTermPool(client, userId, scope, count, "admin"),
    fetchTraceCandidatesForUser(client, userId, scope),
  ]);
  const candidateById = new Map(candidates.map((c) => [c.termId, c]));
  const now = new Date();
  const terms: ReviewSessionTerm[] = cards.map((card) => {
    const candidate = candidateById.get(card.id);
    return {
      id: card.id,
      status: candidate ? computeTraceSnapshot(candidate, now).knownLabel : "unknown",
    };
  });

  const session: TelegramReviewSession = {
    userId,
    domainId,
    terms,
    currentIndex: 0,
    revealed: false,
    retainedCount: 0,
    startedAt: Date.now(),
  };

  if (terms.length > 0) {
    await saveStoredReviewSession(client, chatId, {
      domainId: session.domainId,
      terms: session.terms,
      currentIndex: session.currentIndex,
      revealed: session.revealed,
      retainedCount: session.retainedCount,
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
    domainId: data.review_session.domainId,
    terms: data.review_session.terms,
    currentIndex: data.review_session.currentIndex,
    revealed: data.review_session.revealed,
    retainedCount: data.review_session.retainedCount,
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

export function hasMoreReviewTerms(session: TelegramReviewSession): boolean {
  return session.currentIndex < session.terms.length;
}

export async function getCurrentReviewTerm(
  client: Client,
  session: TelegramReviewSession,
): Promise<TermCard | null> {
  if (session.currentIndex >= session.terms.length) return null;
  const termId = session.terms[session.currentIndex].id;
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
