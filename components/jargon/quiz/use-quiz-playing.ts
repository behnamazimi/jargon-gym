import { useEffect, useMemo, useState } from "react";
import { generateQuizAction } from "@/app/(private)/jargon/quiz/actions";
import type { QuizAnswer, QuizQuestion, QuizQuestionStyle, QuizTerm } from "@/lib/quiz/types";
import {
  clearQuizSession,
  loadQuizSession,
  saveQuizSession,
  type QuizSessionState,
} from "@/lib/quiz/session-storage";
import type { QuizStep } from "@/components/jargon/quiz/use-quiz-setup";
import { retryQuizSubmit, submitQuizAnswer } from "@/components/jargon/quiz/quiz-answer-actions";

type UseQuizPlayingArgs = {
  step: QuizStep;
  setStep: (step: QuizStep) => void;
  questionStyle: QuizQuestionStyle;
  setQuestionStyle: (style: QuizQuestionStyle) => void;
  setSelectedCollectionId: (id: string) => void;
  setQuestionCount: (count: number) => void;
  setQuestionCountInput: (value: string) => void;
  setErrorMessage: (message: string | null) => void;
  domainIds: "all" | string[];
  questionCount: number;
};

export function useQuizPlaying({
  step,
  setStep,
  questionStyle,
  setQuestionStyle,
  setSelectedCollectionId,
  setQuestionCount,
  setQuestionCountInput,
  setErrorMessage,
  domainIds,
  questionCount,
}: UseQuizPlayingArgs) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [terms, setTerms] = useState<QuizTerm[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [resultsScore, setResultsScore] = useState<{
    score: number;
    total: number;
  } | null>(null);
  const [savedSession, setSavedSession] = useState<QuizSessionState | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string>(new Date().toISOString());
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [pendingFinalAnswers, setPendingFinalAnswers] = useState<QuizAnswer[] | null>(null);

  useEffect(() => {
    setSavedSession(loadQuizSession());
  }, []);

  useEffect(() => {
    if (step !== "playing" || questions.length === 0) return;

    saveQuizSession({
      setup: { domainIds, questionCount: questions.length, questionStyle },
      questions,
      terms,
      currentIndex,
      answers,
      startedAt: sessionStartedAt,
    });
  }, [step, questions, terms, currentIndex, answers, domainIds, questionStyle, sessionStartedAt]);

  const termById = useMemo(() => new Map(terms.map((term) => [term.id, term])), [terms]);
  const correctSoFar = answers.filter((answer) => answer.passed).length;

  function handleResumeSession() {
    if (!savedSession) return;

    setQuestionStyle(savedSession.setup.questionStyle ?? "ai");
    setSelectedCollectionId(
      savedSession.setup.domainIds === "all" ? "all" : savedSession.setup.domainIds[0],
    );
    setQuestionCount(savedSession.setup.questionCount);
    setQuestionCountInput(String(savedSession.setup.questionCount));
    setQuestions(savedSession.questions);
    setTerms(savedSession.terms);
    setCurrentIndex(savedSession.currentIndex);
    setAnswers(savedSession.answers);
    setSessionStartedAt(savedSession.startedAt);
    setErrorMessage(null);
    setPendingFinalAnswers(null);
    setSavedSession(null);
    setStep("playing");
  }

  function handleDiscardSession() {
    clearQuizSession();
    setSavedSession(null);
  }

  function resetQuizState() {
    clearQuizSession();
    setSavedSession(null);
    setQuestions([]);
    setTerms([]);
    setCurrentIndex(0);
    setAnswers([]);
    setResultsScore(null);
    setErrorMessage(null);
    setPendingFinalAnswers(null);
    setStep("picker");
    setSessionStartedAt(new Date().toISOString());
  }

  async function handleStartQuiz(llmConfigured: boolean) {
    if (questionStyle === "ai" && !llmConfigured) {
      setErrorMessage("Add a provider and API key in Settings to generate AI quizzes.");
      return;
    }

    clearQuizSession();
    setSavedSession(null);
    setErrorMessage(null);
    setStep("generating");
    setSessionStartedAt(new Date().toISOString());

    const result = await generateQuizAction({ domainIds, questionCount, questionStyle });

    if ("error" in result) {
      setErrorMessage(result.error);
      setStep("error");
      return;
    }

    setQuestions(result.questions);
    setTerms(result.terms);
    setCurrentIndex(0);
    setAnswers([]);
    setStep("playing");
  }

  const answerSetters = {
    setStep,
    setErrorMessage,
    setIsSubmittingAnswer,
    setAnswers,
    setCurrentIndex,
    setResultsScore,
    setSavedSession,
    setPendingFinalAnswers,
  };

  async function handleQuestionAnswer(passed: boolean) {
    if (isSubmittingAnswer) return;
    setIsSubmittingAnswer(true);
    setErrorMessage(null);

    await submitQuizAnswer(answerSetters, passed, {
      question: questions[currentIndex],
      answers,
      currentIndex,
      totalQuestions: questions.length,
    });
  }

  async function handleRetrySubmit() {
    if (!pendingFinalAnswers || isSubmittingAnswer) return;
    setIsSubmittingAnswer(true);
    setErrorMessage(null);

    await retryQuizSubmit(answerSetters, pendingFinalAnswers, questions.length);
  }

  const score = resultsScore?.score ?? answers.filter((answer) => answer.passed).length;
  const resultsTotal = resultsScore?.total ?? questions.length;

  return {
    questions,
    currentIndex,
    savedSession,
    isSubmittingAnswer,
    pendingFinalAnswers,
    termById,
    correctSoFar,
    handleResumeSession,
    handleDiscardSession,
    resetQuizState,
    handleStartQuiz,
    handleQuestionAnswer,
    handleRetrySubmit,
    score,
    resultsTotal,
  };
}
