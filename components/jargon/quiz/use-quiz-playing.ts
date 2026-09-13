import { useEffect, useMemo, useRef, useState } from "react";
import { generateQuizAction } from "@/app/(private)/jargon/quiz/actions";
import { revalidateStudyPathsAction } from "@/app/(private)/jargon/actions";
import type { QuizAnswer, QuizQuestion, QuizQuestionStyle, QuizTerm } from "@/lib/quiz/types";
import {
  clearQuizSession,
  loadQuizSession,
  saveQuizSession,
  type QuizSessionState,
} from "@/lib/quiz/session-storage";
import type { QuizStep } from "@/components/jargon/quiz/use-quiz-setup";
import { submitQuizAnswer } from "@/components/jargon/quiz/quiz-answer-actions";
import { useQuizWriteQueue } from "@/components/jargon/quiz/use-quiz-write-queue";

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

  const advancedQuestionKeyRef = useRef<string | null>(null);

  const {
    pendingWrites,
    setPendingWrites,
    enqueueAnswerWrite,
    flushPendingWrites,
    markSessionComplete,
    resetSession,
  } = useQuizWriteQueue({
    setErrorMessage,
    onSessionIdleAfterComplete: () => {
      clearQuizSession();
      setSavedSession(null);
      void revalidateStudyPathsAction("quiz");
    },
  });

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
      pendingWrites,
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
    sessionStartedAt,
  ]);

  const termById = useMemo(() => new Map(terms.map((term) => [term.id, term])), [terms]);
  const correctSoFar = answers.filter((answer) => answer.passed).length;

  const answerSetters = {
    setStep,
    setAnswers,
    setCurrentIndex,
    setResultsScore,
    setPendingWrites,
    enqueueAnswerWrite,
    markSessionComplete,
  };

  function handleResumeSession() {
    if (!savedSession) return;

    resetSession();
    advancedQuestionKeyRef.current = null;
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
    setPendingWrites(savedSession.pendingWrites);
    setSessionStartedAt(savedSession.startedAt);
    setErrorMessage(null);
    setSavedSession(null);
    setStep("playing");
    flushPendingWrites(savedSession.pendingWrites);
  }

  function handleDiscardSession() {
    // Discarding the session UI must not discard answers the user already
    // submitted — give any unconfirmed write one more shot before clearing.
    if (savedSession) flushPendingWrites(savedSession.pendingWrites);
    clearQuizSession();
    setSavedSession(null);
  }

  function resetQuizState() {
    resetSession();
    advancedQuestionKeyRef.current = null;
    clearQuizSession();
    setSavedSession(null);
    setQuestions([]);
    setTerms([]);
    setCurrentIndex(0);
    setAnswers([]);
    setPendingWrites([]);
    setResultsScore(null);
    setErrorMessage(null);
    setStep("picker");
    setSessionStartedAt(new Date().toISOString());
  }

  async function handleStartQuiz(llmConfigured: boolean) {
    if (questionStyle === "ai" && !llmConfigured) {
      setErrorMessage("Add a provider and API key in Settings to generate AI quizzes.");
      return;
    }

    // Same as discard: starting fresh abandons the OLD session's UI, but
    // any answer the user already submitted in it still needs to reach the
    // server, so flush before clearing storage.
    if (savedSession) flushPendingWrites(savedSession.pendingWrites);
    resetSession();
    advancedQuestionKeyRef.current = null;
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
    setPendingWrites([]);
    setStep("playing");
  }

  function handleQuestionAnswer(passed: boolean) {
    const question = questions[currentIndex];
    if (!question) return;

    const key = `${question.termId}-${currentIndex}`;
    if (advancedQuestionKeyRef.current === key) return;
    advancedQuestionKeyRef.current = key;

    setErrorMessage(null);
    submitQuizAnswer(answerSetters, passed, {
      question,
      answers,
      currentIndex,
      totalQuestions: questions.length,
    });
  }

  const score = resultsScore?.score ?? answers.filter((answer) => answer.passed).length;
  const resultsTotal = resultsScore?.total ?? questions.length;

  return {
    questions,
    currentIndex,
    savedSession,
    termById,
    correctSoFar,
    handleResumeSession,
    handleDiscardSession,
    resetQuizState,
    handleStartQuiz,
    handleQuestionAnswer,
    score,
    resultsTotal,
  };
}
