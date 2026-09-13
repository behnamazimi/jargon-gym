import { useRef, useState, useTransition } from "react";
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
  persistPlayingSnapshot,
  type PlayingSnapshot,
  resetReviewToSetup,
  resumeReviewSession,
  startReviewSession,
  upsertPendingWrite,
  upsertRating,
} from "@/components/jargon/review/review-session-actions";
import { useMountEffect } from "@/hooks/use-mount-effect";

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

  useMountEffect(() => {
    const loaded = loadReviewSession();
    if (!loaded) return;
    if (loaded.complete) {
      flushPendingWrites(loaded.pendingWrites);
      markComplete();
      return;
    }
    setSavedSession(loaded);
  });

  const currentCard = cards[currentIndex];
  const currentRevealed = currentCard ? revealedTermIds.includes(currentCard.id) : false;
  const currentRating = currentCard
    ? ratings.find((rating) => rating.termId === currentCard.id)
    : undefined;

  function persistSnapshot(overrides: Partial<PlayingSnapshot> = {}) {
    persistPlayingSnapshot(
      {
        step,
        cards,
        currentIndex,
        ratings,
        revealedTermIds,
        setup: currentSetup,
        startedAt: sessionStartedAt,
        pendingWrites,
      },
      overrides,
    );
  }

  function goToIndex(nextIndex: number, extra?: Partial<PlayingSnapshot>) {
    setCurrentIndex(nextIndex);
    persistSnapshot({ currentIndex: nextIndex, ...extra });
  }

  function completeSession(finalRatings: ReviewRating[], nextPendingWrites = pendingWrites) {
    markComplete();
    finishReviewSession(setters, finalRatings);
    persistSnapshot({ step: "summary", ratings: finalRatings, pendingWrites: nextPendingWrites });
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
    // Flush tapped grades before dropping the session UI.
    if (savedSession) flushPendingWrites(savedSession.pendingWrites);
    clearReviewSession();
    setters.setSavedSession(null);
  }

  function handleStartReview() {
    // Flush the abandoned session's grades before startReviewSession clears storage.
    if (savedSession) flushPendingWrites(savedSession.pendingWrites);
    resetSession();
    advancedCardIdRef.current = null;
    startReviewSession({ ...setters, setPendingWrites }, currentSetup, startReview);
  }

  function handleReveal() {
    if (!currentCard || currentRevealed) return;
    const nextRevealed = [...revealedTermIds, currentCard.id];
    setRevealedTermIds(nextRevealed);
    persistSnapshot({ revealedTermIds: nextRevealed });

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
    goToIndex(Math.max(0, currentIndex - 1));
  }

  function handleNext() {
    goToIndex(Math.min(cards.length - 1, currentIndex + 1));
  }

  function handleMarkedKnown() {
    if (currentIndex + 1 < cards.length) {
      goToIndex(currentIndex + 1);
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
    const write = enqueueRating(currentCard.id, grade);
    const nextPendingWrites = upsertPendingWrite(pendingWrites, write);

    if (alreadyRated) {
      persistSnapshot({ ratings: nextRatings, pendingWrites: nextPendingWrites });
      return;
    }

    advancedCardIdRef.current = currentCard.id;

    if (currentIndex + 1 < cards.length) {
      goToIndex(currentIndex + 1, {
        ratings: nextRatings,
        pendingWrites: nextPendingWrites,
      });
      return;
    }

    completeSession(nextRatings, nextPendingWrites);
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
