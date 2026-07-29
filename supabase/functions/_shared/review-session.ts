import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { TermRow } from "./telegram-api.ts";
import { fetchTermById } from "./term-service.ts";

export type ReviewStatus = "known" | "unknown";

export interface ReviewSession {
  userId: string;
  status: ReviewStatus;
  termIds: string[];
  currentIndex: number;
  correctCount: number;
  startedAt: number;
}

type StoredQuizSession = {
  status: ReviewStatus;
  termIds: string[];
  currentIndex: number;
  correctCount: number;
  startedAt: number;
};

// Session auto-expires after 30 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function isStoredSession(value: unknown): value is StoredQuizSession {
  if (!value || typeof value !== "object") return false;

  const session = value as StoredQuizSession;
  return (
    (session.status === "known" || session.status === "unknown") &&
    Array.isArray(session.termIds) &&
    session.termIds.every((id) => typeof id === "string") &&
    typeof session.currentIndex === "number" &&
    typeof session.correctCount === "number" &&
    typeof session.startedAt === "number"
  );
}

async function loadStoredSession(
  supabase: SupabaseClient,
  chatId: number,
): Promise<{ userId: string; session: StoredQuizSession } | null> {
  const { data, error } = await supabase
    .from("telegram_links")
    .select("user_id, quiz_session")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.user_id || !isStoredSession(data.quiz_session)) {
    return null;
  }

  return {
    userId: data.user_id,
    session: data.quiz_session,
  };
}

async function saveStoredSession(
  supabase: SupabaseClient,
  chatId: number,
  session: StoredQuizSession,
): Promise<void> {
  const { error } = await supabase
    .from("telegram_links")
    .update({
      quiz_session: session,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

/**
 * Fetch terms for the quiz session based on status
 */
async function fetchTermIdsByStatus(
  supabase: SupabaseClient,
  userId: string,
  status: ReviewStatus,
  limit: number,
): Promise<string[]> {
  const { data, error } = await supabase.rpc(
    status === "unknown" ? "pick_multiple_unknown_terms" : "pick_multiple_known_terms",
    {
      p_user_id: userId,
      p_limit: limit,
    },
  );

  if (error) {
    console.error(`Error fetching ${status} terms:`, error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as Array<{ id: string }>).map((row) => String(row.id));
}

/**
 * Create a new quiz session and persist it
 */
export async function createSession(
  supabase: SupabaseClient,
  chatId: number,
  userId: string,
  status: ReviewStatus,
  count: number,
): Promise<ReviewSession> {
  const termIds = await fetchTermIdsByStatus(supabase, userId, status, count);

  const session: ReviewSession = {
    userId,
    status,
    termIds,
    currentIndex: 0,
    correctCount: 0,
    startedAt: Date.now(),
  };

  if (termIds.length > 0) {
    await saveStoredSession(supabase, chatId, {
      status: session.status,
      termIds: session.termIds,
      currentIndex: session.currentIndex,
      correctCount: session.correctCount,
      startedAt: session.startedAt,
    });
  }

  return session;
}

/**
 * Get an active session from the database
 */
export async function getSession(
  supabase: SupabaseClient,
  chatId: number,
): Promise<ReviewSession | null> {
  const loaded = await loadStoredSession(supabase, chatId);
  if (!loaded) {
    return null;
  }

  const { userId, session } = loaded;

  if (Date.now() - session.startedAt > SESSION_TIMEOUT_MS) {
    await deleteSession(supabase, chatId);
    return null;
  }

  return {
    userId,
    status: session.status,
    termIds: session.termIds,
    currentIndex: session.currentIndex,
    correctCount: session.correctCount,
    startedAt: session.startedAt,
  };
}

/**
 * Update session after answering a question
 */
export async function updateSession(
  supabase: SupabaseClient,
  chatId: number,
  session: ReviewSession,
  wasCorrect: boolean,
): Promise<ReviewSession> {
  const updated: ReviewSession = {
    ...session,
    currentIndex: session.currentIndex + 1,
    correctCount: wasCorrect ? session.correctCount + 1 : session.correctCount,
  };

  await saveStoredSession(supabase, chatId, {
    status: updated.status,
    termIds: updated.termIds,
    currentIndex: updated.currentIndex,
    correctCount: updated.correctCount,
    startedAt: updated.startedAt,
  });

  return updated;
}

/**
 * Delete a session (cleanup after completion)
 */
export async function deleteSession(supabase: SupabaseClient, chatId: number): Promise<void> {
  const { error } = await supabase
    .from("telegram_links")
    .update({
      quiz_session: null,
      updated_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  if (error) throw error;
}

/**
 * Check if session has more questions
 */
export function hasMoreQuestions(session: ReviewSession): boolean {
  return session.currentIndex < session.termIds.length;
}

/**
 * Get current term from session
 */
export async function getCurrentTerm(
  supabase: SupabaseClient,
  session: ReviewSession,
): Promise<TermRow | null> {
  if (session.currentIndex >= session.termIds.length) {
    return null;
  }

  const termId = session.termIds[session.currentIndex];
  return fetchTermById(supabase, session.userId, termId);
}
