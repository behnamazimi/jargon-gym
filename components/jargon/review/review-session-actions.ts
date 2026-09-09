import {
  clearReviewSession,
  loadReviewSession,
  saveReviewSession,
} from "@/lib/review/session-storage";
import { startReviewAction } from "@/app/(private)/jargon/review/actions";
import type { ReviewRating, ReviewSessionState, ReviewSetup, ReviewTerm } from "@/lib/review/types";
import type { ReviewGrade } from "@/lib/trace";
import type { ReviewStep } from "@/components/jargon/review/use-review-setup";
import type { TransitionStartFunction } from "react";

export function upsertRating(
  ratings: ReviewRating[],
  termId: string,
  grade: ReviewGrade,
): ReviewRating[] {
  const without = ratings.filter((rating) => rating.termId !== termId);
  return [...without, { termId, grade }];
}

export function persistReviewSession(state: {
  cards: ReviewTerm[];
  currentIndex: number;
  ratings: ReviewRating[];
  revealedTermIds: string[];
  setup: ReviewSetup;
  startedAt: string;
}) {
  saveReviewSession({
    setup: state.setup,
    cards: state.cards,
    currentIndex: state.currentIndex,
    ratings: state.ratings,
    revealedTermIds: state.revealedTermIds,
    startedAt: state.startedAt,
  });
  return loadReviewSession();
}

type PlayingSetters = {
  setStep: (step: ReviewStep) => void;
  setCards: (cards: ReviewTerm[]) => void;
  setCurrentIndex: (index: number) => void;
  setRatings: (ratings: ReviewRating[]) => void;
  setRevealedTermIds: (ids: string[]) => void;
  setShownTermIds: (ids: string[]) => void;
  setSessionStartedAt: (startedAt: string) => void;
  setSavedSession: (session: ReviewSessionState | null) => void;
  setErrorMessage: (message: string | null) => void;
};

export function resetReviewToSetup(setters: PlayingSetters, refreshPoolStats: () => void) {
  setters.setStep("setup");
  setters.setCards([]);
  setters.setCurrentIndex(0);
  setters.setRatings([]);
  setters.setRevealedTermIds([]);
  setters.setShownTermIds([]);
  setters.setErrorMessage(null);
  setters.setSavedSession(loadReviewSession());
  refreshPoolStats();
}

export function finishReviewSession(
  setters: Pick<PlayingSetters, "setRatings" | "setSavedSession" | "setStep">,
  finalRatings: ReviewRating[],
) {
  setters.setRatings(finalRatings);
  clearReviewSession();
  setters.setSavedSession(null);
  setters.setStep("summary");
}

export function resumeReviewSession(
  setters: PlayingSetters & {
    setSelectedCollectionId: (id: string) => void;
    setCardCount: (count: number) => void;
  },
  savedSession: ReviewSessionState,
) {
  setters.setSelectedCollectionId(
    savedSession.setup.domainIds === "all" ? "all" : savedSession.setup.domainIds[0],
  );
  setters.setCardCount(savedSession.setup.cardCount);
  setters.setCards(savedSession.cards);
  setters.setCurrentIndex(savedSession.currentIndex);
  setters.setRatings(savedSession.ratings);
  setters.setRevealedTermIds(savedSession.revealedTermIds);
  setters.setShownTermIds(savedSession.revealedTermIds);
  setters.setSessionStartedAt(savedSession.startedAt);
  setters.setErrorMessage(null);
  setters.setStep("playing");
}

export function startReviewSession(
  setters: PlayingSetters,
  currentSetup: ReviewSetup,
  startTransitionFn: TransitionStartFunction,
) {
  setters.setErrorMessage(null);
  clearReviewSession();
  setters.setSavedSession(null);

  startTransitionFn(async () => {
    const result = await startReviewAction(currentSetup);

    if ("error" in result) {
      setters.setErrorMessage(result.error ?? "Couldn't start the review. Try again.");
      return;
    }

    const startedAt = new Date().toISOString();
    setters.setSessionStartedAt(startedAt);
    setters.setCards(result.cards);
    setters.setCurrentIndex(0);
    setters.setRatings([]);
    setters.setRevealedTermIds([]);
    setters.setShownTermIds([]);
    setters.setStep("playing");

    const saved = persistReviewSession({
      setup: currentSetup,
      cards: result.cards,
      currentIndex: 0,
      ratings: [],
      revealedTermIds: [],
      startedAt,
    });
    setters.setSavedSession(saved);
  });
}
