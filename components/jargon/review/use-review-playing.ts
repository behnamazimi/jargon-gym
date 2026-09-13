import { useEffect, useRef, useState, useTransition } from "react";
import { GOOD, type ReviewGrade } from "@/lib/trace";
import {
  recordReviewRevealAction,
  revalidateStudyPathsAction,
} from "@/app/(private)/jargon/actions";
import { clearReviewSession, loadReviewSession } from "@/lib/review/session-storage";
import type { ReviewRating, ReviewSessionState, ReviewSetup, ReviewTerm } from "@/lib/review/types";
import type { ReviewStep } from "@/components/jargon/review/use-review-setup";
import { useReviewWriteQueue } from "@/components/jargon/review/use-review-write-queue";
import {
  finalizeReviewSessionIfComplete,
  finishReviewSession,
  persistReviewSession,
  resetReviewToSetup,
  resumeReviewSession,
  startReviewSession,
  upsertRating,
} from "@/components/jargon/review/review-session-actions";

type UseReviewPlayingArgs = {
  step: ReviewStep;
  setStep: (step: ReviewStep) => void;
  currentSetup: ReviewSetup;
  setSelectedCollectionId: (id: string) => void;
  setCardCount: (count: number) => void;
  setErrorMessage: (message: string | null) => void;
  refreshPoolStats: () => void;
};

export function useReviewPlaying({
  step,
  setStep,
  currentSetup,
  setSelectedCollectionId,
  setCardCount,
  setErrorMessage,
  refreshPoolStats,
}: UseReviewPlayingArgs) {
  const [cards, setCards] = useState<ReviewTerm[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<ReviewRating[]>([]);
  const [revealedTermIds, setRevealedTermIds] = useState<string[]>([]);
  const [isStarting, startReview] = useTransition();
  const [savedSession, setSavedSession] = useState<ReviewSessionState | null>(null);
  const [shownTermIds, setShownTermIds] = useState<string[]>([]);
  const [sessionStartedAt, setSessionStartedAt] = useState<string>(new Date().toISOString());

  const advancedCardIdRef = useRef<string | null>(null);

  const setters = {
    setStep,
    setCards,
    setCurrentIndex,
    setRatings,
    setRevealedTermIds,
    setShownTermIds,
    setSessionStartedAt,
    setSavedSession,
    setErrorMessage,
    setSelectedCollectionId,
    setCardCount,
  };

  const {
    pendingWrites,
    setPendingWrites,
    enqueueRating,
    flushPendingWrites,
    markComplete,
    resetSession,
  } = useReviewWriteQueue({
    setErrorMessage,
    onSessionIdleAfterComplete: () => {
      finalizeReviewSessionIfComplete(setters);
      void revalidateStudyPathsAction("review");
    },
  });

  useEffect(() => {
    const loaded = loadReviewSession();
    if (!loaded) return;
    if (loaded.complete) {
      flushPendingWrites(loaded.pendingWrites);
      markComplete();
      return;
    }
    setSavedSession(loaded);
  }, []);

  const currentCard = cards[currentIndex];
  const currentRevealed = currentCard ? revealedTermIds.includes(currentCard.id) : false;
  const currentRating = currentCard
    ? ratings.find((rating) => rating.termId === currentCard.id)
    : undefined;

  useEffect(() => {
    if (cards.length === 0) return;
    if (step !== "playing" && step !== "summary") return;
    if (step === "summary" && pendingWrites.length === 0) return;

    setSavedSession(
      persistReviewSession({
        setup: currentSetup,
        cards,
        currentIndex,
        ratings,
        revealedTermIds,
        startedAt: sessionStartedAt,
        pendingWrites,
        complete: step === "summary",
      }),
    );
  }, [
    step,
    cards,
    currentIndex,
    ratings,
    revealedTermIds,
    pendingWrites,
    currentSetup,
    sessionStartedAt,
  ]);

  function completeSession(finalRatings: ReviewRating[]) {
    markComplete();
    finishReviewSession(setters, finalRatings);
  }

  function resetToSetup() {
    resetSession();
    advancedCardIdRef.current = null;
    resetReviewToSetup({ ...setters, setPendingWrites }, refreshPoolStats);
  }

  function handleResumeSession() {
    if (!savedSession) return;
    resetSession();
    advancedCardIdRef.current = null;
    resumeReviewSession({ ...setters, setPendingWrites }, savedSession);
    flushPendingWrites(savedSession.pendingWrites);
  }

  function handleDiscardSession() {
    // Discarding the session UI must not discard grades the user already
    // tapped — give any unconfirmed write one more shot before clearing.
    if (savedSession) flushPendingWrites(savedSession.pendingWrites);
    clearReviewSession();
    setters.setSavedSession(null);
  }

  function handleStartReview() {
    // Same as discard: starting fresh abandons the OLD session's UI, but
    // any grade the user already tapped in it still needs to reach the
    // server, so flush before startReviewSession clears storage.
    if (savedSession) flushPendingWrites(savedSession.pendingWrites);
    resetSession();
    advancedCardIdRef.current = null;
    startReviewSession({ ...setters, setPendingWrites }, currentSetup, startReview);
  }

  function handleReveal() {
    if (!currentCard || currentRevealed) return;
    setRevealedTermIds((ids) => [...ids, currentCard.id]);

    if (!shownTermIds.includes(currentCard.id)) {
      setShownTermIds((ids) => [...ids, currentCard.id]);
      void recordReviewRevealAction(currentCard.id).then((result) => {
        if (result.error) {
          setErrorMessage(result.error);
        }
      });
    }
  }

  function handlePrevious() {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }

  function handleNext() {
    setCurrentIndex((index) => Math.min(cards.length - 1, index + 1));
  }

  function handleMarkedKnown() {
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((index) => index + 1);
      return;
    }
    completeSession(ratings);
  }

  function handleRate(grade: ReviewGrade) {
    if (!currentCard || !currentRevealed) return;

    const alreadyRated = ratings.some((rating) => rating.termId === currentCard.id);
    if (!alreadyRated && advancedCardIdRef.current === currentCard.id) return;

    const nextRatings = upsertRating(ratings, currentCard.id, grade);
    setRatings(nextRatings);
    enqueueRating(currentCard.id, grade);

    if (alreadyRated) return;

    advancedCardIdRef.current = currentCard.id;

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    completeSession(nextRatings);
  }

  function handleDone() {
    completeSession(ratings);
  }

  const retainedCount = ratings.filter((rating) => rating.grade >= GOOD).length;
  const forgotCount = ratings.length - retainedCount;

  return {
    cards,
    currentIndex,
    ratings,
    isStarting,
    savedSession: savedSession?.complete ? null : savedSession,
    currentCard,
    currentRevealed,
    currentRating,
    resetToSetup,
    handleResumeSession,
    handleDiscardSession,
    handleStartReview,
    handleReveal,
    handlePrevious,
    handleNext,
    handleMarkedKnown,
    handleRate,
    handleDone,
    retainedCount,
    forgotCount,
  };
}
