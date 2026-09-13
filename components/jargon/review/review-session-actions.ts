import {
  clearReviewSession,
  loadReviewSession,
  saveReviewSession,
} from "@/lib/review/session-storage";
import { startReviewAction } from "@/app/(private)/jargon/review/actions";
import type {
  PendingReviewWrite,
  ReviewRating,
  ReviewSessionState,
  ReviewSetup,
  ReviewTerm,
} from "@/lib/review/types";
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

export function upsertPendingWrite(
  pendingWrites: PendingReviewWrite[],
  write: PendingReviewWrite,
): PendingReviewWrite[] {
  const without = pendingWrites.filter((existing) => existing.termId !== write.termId);
  return [...without, write];
}

function persistReviewSession(state: {
  cards: ReviewTerm[];
  currentIndex: number;
  ratings: ReviewRating[];
  revealedTermIds: string[];
  setup: ReviewSetup;
  startedAt: string;
  pendingWrites: PendingReviewWrite[];
  complete?: boolean;
}) {
  saveReviewSession({
    setup: state.setup,
    cards: state.cards,
    currentIndex: state.currentIndex,
    ratings: state.ratings,
    revealedTermIds: state.revealedTermIds,
    startedAt: state.startedAt,
    pendingWrites: state.pendingWrites,
    complete: state.complete === true,
  });
  return loadReviewSession();
}

export type PlayingSnapshot = {
  step: ReviewStep;
  cards: ReviewTerm[];
  currentIndex: number;
  ratings: ReviewRating[];
  revealedTermIds: string[];
  setup: ReviewSetup;
  startedAt: string;
  pendingWrites: PendingReviewWrite[];
};

/** Writes the playing/summary snapshot to localStorage. Same guards as the
 *  old persist effect: skip an empty deck, ignore setup, and don't leave a
 *  finished session with nothing left to replay. */
export function persistPlayingSnapshot(
  state: PlayingSnapshot,
  overrides: Partial<PlayingSnapshot> = {},
) {
  const next = { ...state, ...overrides };
  if (next.cards.length === 0) return;
  if (next.step !== "playing" && next.step !== "summary") return;
  if (next.step === "summary" && next.pendingWrites.length === 0) return;

  persistReviewSession({
    setup: next.setup,
    cards: next.cards,
    currentIndex: next.currentIndex,
    ratings: next.ratings,
    revealedTermIds: next.revealedTermIds,
    startedAt: next.startedAt,
    pendingWrites: next.pendingWrites,
    complete: next.step === "summary",
  });
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
  setPendingWrites: (writes: PendingReviewWrite[]) => void;
};

export function resetReviewToSetup(setters: PlayingSetters, refreshPoolStats: () => void) {
  setters.setStep("setup");
  setters.setCards([]);
  setters.setCurrentIndex(0);
  setters.setRatings([]);
  setters.setRevealedTermIds([]);
  setters.setShownTermIds([]);
  setters.setErrorMessage(null);
  setters.setPendingWrites([]);
  const loaded = loadReviewSession();
  setters.setSavedSession(loaded?.complete ? null : loaded);
  refreshPoolStats();
}

/** Advances the UI to the summary step immediately (optimistic). Storage
 *  isn't cleared here — that only happens once the write queue is
 *  confirmed idle, via finalizeReviewSessionIfComplete, so a write still
 *  in flight when the user navigates away survives for resume/replay. */
export function finishReviewSession(
  setters: Pick<PlayingSetters, "setRatings" | "setStep">,
  finalRatings: ReviewRating[],
) {
  setters.setRatings(finalRatings);
  setters.setStep("summary");
}

export function finalizeReviewSessionIfComplete(setters: Pick<PlayingSetters, "setSavedSession">) {
  clearReviewSession();
  setters.setSavedSession(null);
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
  setters.setPendingWrites(savedSession.pendingWrites);
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
    setters.setPendingWrites([]);
    setters.setStep("playing");

    const saved = persistReviewSession({
      setup: currentSetup,
      cards: result.cards,
      currentIndex: 0,
      ratings: [],
      revealedTermIds: [],
      startedAt,
      pendingWrites: [],
      complete: false,
    });
    setters.setSavedSession(saved);
  });
}
