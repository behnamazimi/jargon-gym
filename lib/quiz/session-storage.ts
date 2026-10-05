import type { QuestionType } from "@/lib/trace";
import { isQuizQuestion } from "./question-schema";
import type { QuizAnswer, QuizQuestion, QuizQuestionStyle, QuizTerm } from "./types";

type QuizSetup = {
  domainIds: string[] | "all";
  questionCount: number;
  questionStyle: QuizQuestionStyle;
};

export type PendingQuizWrite = {
  id: string;
  termId: string;
  passed: boolean;
  questionType: QuestionType;
};

export type QuizSessionState = {
  setup: QuizSetup;
  questions: QuizQuestion[];
  terms: QuizTerm[];
  currentIndex: number;
  answers: QuizAnswer[];
  startedAt: string;
  /** Answers applied locally but not yet confirmed persisted by the write
   *  queue — replayed on resume so a crash/reload can't silently drop one. */
  pendingWrites: PendingQuizWrite[];
  /** True once the last question has been answered. A reload must not
   *  restore that question as if the quiz were still in progress. */
  complete?: boolean;
};

// Bump the version when the stored question shape changes; the old key is
// removed on the next load so a session in the old shape is simply dropped.
const STORAGE_KEY = "lobyas:quiz-session:v2";
const LEGACY_STORAGE_KEYS = ["lobyas:quiz-session:v1"];

export function saveQuizSession(state: QuizSessionState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors or private browsing restrictions.
  }
}

export function loadQuizSession(): QuizSessionState | null {
  if (typeof window === "undefined") return null;

  try {
    for (const key of LEGACY_STORAGE_KEYS) window.localStorage.removeItem(key);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as QuizSessionState;
    if (!parsed.questions?.length || !parsed.setup) return null;
    if (!parsed.questions.every(isQuizQuestion)) return null;

    parsed.pendingWrites ??= [];
    parsed.complete = parsed.complete === true;

    return parsed;
  } catch {
    return null;
  }
}

export function clearQuizSession(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

/** Drops a settled write from the stored session. Called from onSettled
 *  so a drain after unmount still updates localStorage when React state
 *  no longer will. Clears the session once a completed one has no writes
 *  left, so a reload doesn't offer to resume a finished quiz. */
export function dropPendingQuizWrite(writeId: string): void {
  const session = loadQuizSession();
  if (!session) return;

  const pendingWrites = session.pendingWrites.filter((write) => write.id !== writeId);
  if (session.complete && pendingWrites.length === 0) {
    clearQuizSession();
    return;
  }

  saveQuizSession({ ...session, pendingWrites });
}
