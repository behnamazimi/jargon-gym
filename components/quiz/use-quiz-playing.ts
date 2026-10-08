import { track } from "@/lib/analytics/track";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { generateQuizAction } from "@/app/(private)/app/quiz/actions";
import type { AiFailureReason } from "@/lib/llm/types";
import { missedQuestions, missedTermIds } from "@/lib/quiz/results";
import type { QuizAnswer, QuizQuestion, QuizTerm } from "@/lib/quiz/types";
import {
  clearQuizSession,
  loadQuizSession,
  type QuizSessionState,
} from "@/lib/quiz/session-storage";
import type { useQuizSetup } from "@/components/quiz/use-quiz-setup";
import { submitQuizAnswer } from "@/components/quiz/quiz-answer-actions";
import { useQuizSessionPersistence } from "@/components/quiz/use-quiz-session-persistence";
import { useQuizWriteQueue } from "@/components/quiz/use-quiz-write-queue";

export function useQuizPlaying(setup: ReturnType<typeof useQuizSetup>) {
  const {
    step,
    setStep,
    questionStyle,
    setQuestionStyle,
    setSelectedCollectionId,
    setQuestionCount,
    setQuestionCountInput,
    setErrorMessage,
    collectionIds,
    questionCount,
  } = setup;
  const router = useRouter();
  const [errorReason, setErrorReason] = useState<AiFailureReason | null>(null);
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
  // Replaying missed questions: graded on screen, never sent to TRACE.
  const [practice, setPractice] = useState(false);

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
    },
  });

  useEffect(() => {
    const loaded = loadQuizSession();
    if (!loaded) return;
    if (loaded.complete) {
      flushPendingWrites(loaded.pendingWrites);
      markSessionComplete();
      return;
    }
    setSavedSession(loaded);
  }, []);

  useQuizSessionPersistence({
    practice,
    step,
    questions,
    terms,
    currentIndex,
    answers,
    pendingWrites,
    collectionIds,
    questionStyle,
    startedAt: sessionStartedAt,
  });

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
      savedSession.setup.collectionIds === "all" ? "all" : savedSession.setup.collectionIds[0],
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

  function resetQuizState() {
    setPractice(false);
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
    setErrorReason(null);
    setStep("picker");
    setSessionStartedAt(new Date().toISOString());
  }

  async function handleStartQuiz(canUseAi: boolean) {
    if (questionStyle === "ai" && !canUseAi) {
      setErrorMessage("AI quizzes aren't available right now. Use a simple quiz.");
      return;
    }

    // Same as discard: starting fresh abandons the OLD session's UI, but
    // any answer the user already submitted in it still needs to reach the
    // server, so flush before clearing storage.
    if (savedSession) flushPendingWrites(savedSession.pendingWrites);
    setPractice(false);
    resetSession();
    advancedQuestionKeyRef.current = null;
    clearQuizSession();
    setSavedSession(null);
    setErrorMessage(null);
    setErrorReason(null);
    setStep("generating");
    setSessionStartedAt(new Date().toISOString());

    const result = await generateQuizAction({ collectionIds, questionCount, questionStyle });

    // The balance may have changed either way, so refresh what shows it.
    if (questionStyle === "ai") router.refresh();

    if ("error" in result) {
      setErrorMessage(result.error);
      setErrorReason(result.reason ?? null);
      setStep("error");
      return;
    }

    track("quiz_started", {
      question_style: questionStyle,
      question_count: result.questions.length,
      collection_scope: collectionIds === "all" ? "all" : "selected",
    });
    setQuestions(result.questions);
    setTerms(result.terms);
    setCurrentIndex(0);
    setAnswers([]);
    setPendingWrites([]);
    setStep("playing");
  }

  /** Leaves the write queue and saved session alone, so the real quiz's
   *  answers keep saving and its pages still revalidate. */
  function handleStartPractice() {
    const missed = missedQuestions(questions, answers);
    if (missed.length === 0) return;

    // Practice reuses term ids at new indexes; a stale key could eat an answer.
    advancedQuestionKeyRef.current = null;
    setPractice(true);
    setQuestions(missed);
    setCurrentIndex(0);
    setAnswers([]);
    setResultsScore(null);
    setErrorMessage(null);
    setStep("playing");
  }

  function handleQuestionAnswer(passed: boolean) {
    const question = questions[currentIndex];
    if (!question) return;

    const key = `${question.termId}-${currentIndex}`;
    if (advancedQuestionKeyRef.current === key) return;
    advancedQuestionKeyRef.current = key;

    setErrorMessage(null);
    if (!practice && currentIndex === questions.length - 1) {
      track("quiz_completed", {
        correct_answers: answers.filter((answer) => answer.passed).length + (passed ? 1 : 0),
        total_questions: questions.length,
        question_style: questionStyle,
      });
    }
    submitQuizAnswer(answerSetters, passed, {
      question,
      answers,
      currentIndex,
      totalQuestions: questions.length,
      practice,
    });
  }

  const score = resultsScore?.score ?? answers.filter((answer) => answer.passed).length;
  const resultsTotal = resultsScore?.total ?? questions.length;

  return {
    errorReason,
    questions,
    currentIndex,
    savedSession: savedSession?.complete ? null : savedSession,
    termById,
    correctSoFar,
    handleResumeSession,
    resetQuizState,
    handleStartQuiz,
    handleQuestionAnswer,
    handleStartPractice,
    practice,
    missedTerms: missedTermIds(questions, answers).flatMap((id) => termById.get(id) ?? []),
    score,
    resultsTotal,
  };
}
