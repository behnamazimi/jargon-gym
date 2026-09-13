import type { QuestionType } from "@/lib/trace";
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
};

const STORAGE_KEY = "jargon-gym:quiz-session:v1";

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
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as QuizSessionState;
    if (!parsed.questions?.length || !parsed.setup) return null;

    parsed.pendingWrites ??= [];

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
