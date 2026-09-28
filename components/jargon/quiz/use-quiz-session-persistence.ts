import { useEffect } from "react";
import type { PendingQuizWrite } from "@/lib/quiz/session-storage";
import { saveQuizSession } from "@/lib/quiz/session-storage";
import type { QuizAnswer, QuizQuestion, QuizQuestionStyle, QuizTerm } from "@/lib/quiz/types";
import type { QuizStep } from "@/components/jargon/quiz/use-quiz-setup";

/** Mirrors an in-progress quiz to storage so it can be resumed, and keeps
 *  a finished one there until its answers are saved. Practice rounds are
 *  never stored — nothing in them needs to reach the server. */
export function useQuizSessionPersistence(session: {
  practice: boolean;
  step: QuizStep;
  questions: QuizQuestion[];
  terms: QuizTerm[];
  currentIndex: number;
  answers: QuizAnswer[];
  pendingWrites: PendingQuizWrite[];
  domainIds: "all" | string[];
  questionStyle: QuizQuestionStyle;
  startedAt: string;
}) {
  const {
    practice,
    step,
    questions,
    terms,
    currentIndex,
    answers,
    pendingWrites,
    domainIds,
    questionStyle,
    startedAt,
  } = session;

  useEffect(() => {
    if (practice) return;
    if (questions.length === 0) return;
    if (step !== "playing" && step !== "results") return;
    if (step === "results" && pendingWrites.length === 0) return;

    saveQuizSession({
      setup: { domainIds, questionCount: questions.length, questionStyle },
      questions,
      terms,
      currentIndex,
      answers,
      startedAt,
      pendingWrites,
      complete: step === "results",
    });
  }, [
    step,
    questions,
    terms,
    currentIndex,
    answers,
    pendingWrites,
    domainIds,
    questionStyle,
    startedAt,
    practice,
  ]);
}
