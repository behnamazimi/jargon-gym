import type { PendingQuizWrite } from "@/lib/quiz/session-storage";
import type { QuizAnswer, QuizQuestion } from "@/lib/quiz/types";
import type { QuizStep } from "@/components/jargon/quiz/use-quiz-setup";

type AnswerSetters = {
  setStep: (step: QuizStep) => void;
  setAnswers: (answers: QuizAnswer[]) => void;
  setCurrentIndex: (updater: (index: number) => number) => void;
  setResultsScore: (score: { score: number; total: number }) => void;
  setPendingWrites: (updater: (writes: PendingQuizWrite[]) => PendingQuizWrite[]) => void;
  /** Enqueues the background TRACE write for one answer and wires up its
   *  own settle handling (retry, toast, pendingWrites cleanup, finalize
   *  check) — defined in the hook, shared with resume-replay. */
  enqueueAnswerWrite: (write: PendingQuizWrite) => void;
  /** Called once, when the last question is answered — marks the session
   *  complete and checks for an immediate finalize, in case the queue is
   *  already idle at that instant. */
  markSessionComplete: () => void;
};

export function submitQuizAnswer(
  setters: AnswerSetters,
  passed: boolean,
  args: {
    question: QuizQuestion;
    answers: QuizAnswer[];
    currentIndex: number;
    totalQuestions: number;
  },
) {
  const isLastQuestion = args.currentIndex + 1 >= args.totalQuestions;
  const nextAnswers = [...args.answers, { termId: args.question.termId, passed }];

  setters.setAnswers(nextAnswers);

  const write: PendingQuizWrite = {
    id: crypto.randomUUID(),
    termId: args.question.termId,
    passed,
    questionType: args.question.type,
  };
  setters.setPendingWrites((prev) => [...prev, write]);
  setters.enqueueAnswerWrite(write);

  if (!isLastQuestion) {
    setters.setCurrentIndex((index) => index + 1);
    return;
  }

  setters.setResultsScore({
    score: nextAnswers.filter((answer) => answer.passed).length,
    total: args.totalQuestions,
  });
  setters.setStep("results");
  setters.markSessionComplete();
}
