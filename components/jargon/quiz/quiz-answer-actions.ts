import {
  recordQuizAnswerAction,
  submitQuizResultsAction,
} from "@/app/(private)/jargon/quiz/actions";
import { clearQuizSession } from "@/lib/quiz/session-storage";
import type { QuizAnswer, QuizQuestion } from "@/lib/quiz/types";
import type { QuizStep } from "@/components/jargon/quiz/use-quiz-setup";

type AnswerSetters = {
  setStep: (step: QuizStep) => void;
  setErrorMessage: (message: string | null) => void;
  setIsSubmittingAnswer: (value: boolean) => void;
  setAnswers: (answers: QuizAnswer[]) => void;
  setCurrentIndex: (updater: (index: number) => number) => void;
  setResultsScore: (score: { score: number; total: number }) => void;
  setSavedSession: (session: null) => void;
  setPendingFinalAnswers: (answers: QuizAnswer[] | null) => void;
};

export async function submitQuizAnswer(
  setters: AnswerSetters,
  passed: boolean,
  args: {
    question: QuizQuestion;
    answers: QuizAnswer[];
    currentIndex: number;
    totalQuestions: number;
  },
) {
  const answerResult = await recordQuizAnswerAction({
    termId: args.question.termId,
    passed,
    questionType: args.question.type,
  });

  if (answerResult.error) {
    setters.setErrorMessage(answerResult.error);
    setters.setIsSubmittingAnswer(false);
    return;
  }

  const nextAnswers = [...args.answers, { termId: args.question.termId, passed }];
  setters.setAnswers(nextAnswers);

  if (args.currentIndex + 1 < args.totalQuestions) {
    setters.setCurrentIndex((index) => index + 1);
    setters.setIsSubmittingAnswer(false);
    return;
  }

  const result = await submitQuizResultsAction();

  if (result.error) {
    setters.setErrorMessage(result.error);
    setters.setPendingFinalAnswers(nextAnswers);
    setters.setIsSubmittingAnswer(false);
    return;
  }

  setters.setResultsScore({
    score: nextAnswers.filter((answer) => answer.passed).length,
    total: args.totalQuestions,
  });
  clearQuizSession();
  setters.setSavedSession(null);
  setters.setStep("results");
  setters.setIsSubmittingAnswer(false);
}

export async function retryQuizSubmit(
  setters: AnswerSetters,
  pendingFinalAnswers: QuizAnswer[],
  totalQuestions: number,
) {
  const result = await submitQuizResultsAction();

  if (result.error) {
    setters.setErrorMessage(result.error);
    setters.setIsSubmittingAnswer(false);
    return;
  }

  setters.setResultsScore({
    score: pendingFinalAnswers.filter((answer) => answer.passed).length,
    total: totalQuestions,
  });
  clearQuizSession();
  setters.setSavedSession(null);
  setters.setPendingFinalAnswers(null);
  setters.setStep("results");
  setters.setIsSubmittingAnswer(false);
}
