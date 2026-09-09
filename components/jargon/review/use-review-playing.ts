import { useEffect, useState, useTransition } from "react";
import { GOOD, type ReviewGrade } from "@/lib/trace";
import { recordReviewRevealAction } from "@/app/(private)/jargon/actions";
import { rateReviewTermAction } from "@/app/(private)/jargon/review/actions";
import { clearReviewSession, loadReviewSession } from "@/lib/review/session-storage";
import type { ReviewRating, ReviewSessionState, ReviewSetup, ReviewTerm } from "@/lib/review/types";
import type { ReviewStep } from "@/components/jargon/review/use-review-setup";
import {
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
  const [isRating, setIsRating] = useState(false);
  const [savedSession, setSavedSession] = useState<ReviewSessionState | null>(null);
  const [shownTermIds, setShownTermIds] = useState<string[]>([]);
  const [sessionStartedAt, setSessionStartedAt] = useState<string>(new Date().toISOString());

  useEffect(() => {
    setSavedSession(loadReviewSession());
  }, []);

  const currentCard = cards[currentIndex];
  const currentRevealed = currentCard ? revealedTermIds.includes(currentCard.id) : false;
  const currentRating = currentCard
    ? ratings.find((rating) => rating.termId === currentCard.id)
    : undefined;

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

  useEffect(() => {
    if (step !== "playing" || cards.length === 0) return;

    setSavedSession(
      persistReviewSession({
        setup: currentSetup,
        cards,
        currentIndex,
        ratings,
        revealedTermIds,
        startedAt: sessionStartedAt,
      }),
    );
  }, [step, cards, currentIndex, ratings, revealedTermIds, currentSetup, sessionStartedAt]);

  function resetToSetup() {
    resetReviewToSetup(setters, refreshPoolStats);
  }

  function handleResumeSession() {
    if (!savedSession) return;
    resumeReviewSession(setters, savedSession);
  }

  function handleDiscardSession() {
    clearReviewSession();
    setters.setSavedSession(null);
  }

  function handleStartReview() {
    startReviewSession(setters, currentSetup, startReview);
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
    finishReviewSession(setters, ratings);
  }

  async function handleRate(grade: ReviewGrade) {
    if (!currentCard || !currentRevealed || isRating) return;

    const alreadyRated = ratings.some((rating) => rating.termId === currentCard.id);

    setIsRating(true);
    const result = await rateReviewTermAction(currentCard.id, grade);
    setIsRating(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    const nextRatings = upsertRating(ratings, currentCard.id, grade);
    setRatings(nextRatings);

    if (alreadyRated) return;

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    finishReviewSession(setters, nextRatings);
  }

  function handleDone() {
    finishReviewSession(setters, ratings);
  }

  const retainedCount = ratings.filter((rating) => rating.grade >= GOOD).length;
  const forgotCount = ratings.length - retainedCount;

  return {
    cards,
    currentIndex,
    ratings,
    isStarting,
    isRating,
    savedSession,
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
