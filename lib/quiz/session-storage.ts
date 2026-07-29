import type {
  QuizAnswer,
  QuizQuestion,
  QuizQuestionStyle,
  QuizTerm,
  QuizTermStatus,
} from "./types";

export type QuizSetup = {
  domainIds: string[] | "all";
  status: QuizTermStatus;
  questionCount: number;
  questionStyle: QuizQuestionStyle;
};

export type QuizSessionState = {
  setup: QuizSetup;
  questions: QuizQuestion[];
  terms: QuizTerm[];
  currentIndex: number;
  answers: QuizAnswer[];
  startedAt: string;
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
