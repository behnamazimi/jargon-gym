import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { fetchStudyTermPool } from "@/lib/study";
import { getPoolStatsForUser } from "@/lib/trace-queue";
import { fetchTraceCandidatesForUser } from "@/lib/trace-queue/repository";
import { computeTraceSnapshot } from "@/lib/trace";
import type { KnownLabel } from "@/lib/trace";
import { domainIdsForScope, type QuizDomainSelection } from "./quiz-session-store";

type Client = SupabaseClient<Database>;

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** One drawn term plus its known-label snapshot at session-build time —
 *  a read-only label derived live from Mastery_adjusted (lib/trace), not a
 *  stored pool. Not yet rendered anywhere; kept for the presentation
 *  fast-follow that gives Telegram Review real 4-point grading.
 *  isNewToUser is snapshotted the same way: whether this term had zero
 *  read/review/quiz activity at session-build time, driving the one-time
 *  "I already know this" prompt on first exposure. */
type ReviewSessionTerm = { id: string; status: KnownLabel; isNewToUser: boolean };

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

function isReviewSessionTerm(value: unknown): value is ReviewSessionTerm {
  if (!value || typeof value !== "object") return false;
  const term = value as ReviewSessionTerm;
  return (
    typeof term.id === "string" &&
    (term.status === "known" || term.status === "learning" || term.status === "unknown") &&
    // Tolerant of sessions persisted before isNewToUser existed.
    (term.isNewToUser === undefined || typeof term.isNewToUser === "boolean")
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

export async function saveStoredReviewSession(
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
      isNewToUser: candidate
        ? candidate.readCount === 0 &&
          candidate.reviewRecallCount === 0 &&
          candidate.quizTestCount === 0
        : false,
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
