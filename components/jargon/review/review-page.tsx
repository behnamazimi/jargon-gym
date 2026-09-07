"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  countTermsForSelection,
  getMaxStudyCount,
  studyCountPresetValues,
} from "@/lib/study/count";
import { type StudyCollection } from "@/lib/study/types";
import { AGAIN, EASY, GOOD, HARD, type ReviewGrade } from "@/lib/trace";
import {
  QuizKeyboardHint,
  QuizPanel,
  QuizPanelLabel,
  QuizStat,
} from "@/components/jargon/quiz/quiz-ui";
import {
  StudyCollectionField,
  StudyCountField,
  StudyNoActiveCollectionsState,
  StudyResumeBanner,
  StudySetupPanel,
} from "@/components/jargon/study/study-setup-panel";
import { StudyProgress } from "@/components/jargon/study/study-progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton, type ButtonVariant } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { recordReviewRevealAction } from "@/app/(private)/jargon/actions";
import {
  getReviewPoolStatsAction,
  rateReviewTermAction,
  startReviewAction,
} from "@/app/(private)/jargon/review/actions";
import { ReviewCard } from "@/components/jargon/review/review-card";
import { ReviewSummary } from "@/components/jargon/review/review-summary";
import { useReviewKeyboard } from "@/components/jargon/review/use-review-keyboard";
import {
  clearReviewSession,
  loadReviewSession,
  saveReviewSession,
} from "@/lib/review/session-storage";
import type { ReviewRating, ReviewSessionState, ReviewSetup, ReviewTerm } from "@/lib/review/types";
import { cn } from "@/lib/utils";

type ReviewStep = "setup" | "playing" | "summary";

type ReviewPageProps = {
  collections: StudyCollection[];
  initialDomainId?: string;
  narrationAccess: boolean;
};

const DEFAULT_CARD_COUNT = 10;

function upsertRating(ratings: ReviewRating[], termId: string, grade: ReviewGrade): ReviewRating[] {
  const without = ratings.filter((rating) => rating.termId !== termId);
  return [...without, { termId, grade }];
}

const GRADE_LABELS: Record<ReviewGrade, string> = {
  [AGAIN]: "Again",
  [HARD]: "Hard",
  [GOOD]: "Good",
  [EASY]: "Easy",
};

const GRADE_BUTTONS: { grade: ReviewGrade; variant: ButtonVariant }[] = [
  { grade: AGAIN, variant: "destructive" },
  { grade: HARD, variant: "warning" },
  { grade: GOOD, variant: "success" },
  { grade: EASY, variant: "info" },
];

function ReviewPoolBreakdown({
  stats,
}: {
  stats: {
    unseen: number;
    seen: number;
    total: number;
  } | null;
}) {
  const unseen = stats?.unseen ?? 0;
  const seen = stats?.seen ?? 0;
  const total = stats?.total ?? 0;

  return (
    <p
      className={cn(
        "mt-1 mb-0 line-clamp-2 min-h-[2lh] text-xs font-normal leading-snug text-base-content/70",
        !stats && "invisible",
      )}
      aria-hidden={!stats}
    >
      <span className="font-medium tabular-nums">{unseen}</span> never reviewed
      {" · "}
      <span className="font-medium tabular-nums">{seen}</span> reviewed
      {" · "}
      <span className="font-medium tabular-nums">
        {seen}/{total}
      </span>{" "}
      covered
    </p>
  );
}

export function ReviewPage({ collections, initialDomainId, narrationAccess }: ReviewPageProps) {
  const reduceMotion = usePrefersReducedMotion();

  const [step, setStep] = useState<ReviewStep>("setup");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    initialDomainId ?? "all",
  );
  const [cardCount, setCardCount] = useState(DEFAULT_CARD_COUNT);
  const [cardCountInput, setCardCountInput] = useState(String(DEFAULT_CARD_COUNT));
  const [cardCountError, setCardCountError] = useState<string | null>(null);
  const [cards, setCards] = useState<ReviewTerm[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<ReviewRating[]>([]);
  const [revealedTermIds, setRevealedTermIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, startReview] = useTransition();
  const [isRating, setIsRating] = useState(false);
  const [savedSession, setSavedSession] = useState<ReviewSessionState | null>(null);
  const [poolStats, setPoolStats] = useState<{
    unseen: number;
    seen: number;
    total: number;
    allSeenOnce: boolean;
  } | null>(null);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [shownTermIds, setShownTermIds] = useState<string[]>([]);

  const domainIds = useMemo(
    (): string[] | "all" => (selectedCollectionId === "all" ? "all" : [selectedCollectionId]),
    [selectedCollectionId],
  );

  const availableTermCount = useMemo(
    () => countTermsForSelection(collections, domainIds),
    [collections, domainIds],
  );

  const maxCardCount = getMaxStudyCount(availableTermCount);

  useEffect(() => {
    setSavedSession(loadReviewSession());
  }, []);

  useEffect(() => {
    if (availableTermCount === 0) return;
    setCardCount((current) => {
      const next = Math.min(Math.max(DEFAULT_CARD_COUNT, 1), getMaxStudyCount(availableTermCount));
      const newCount = Math.min(current, next) || next;
      setCardCountInput(String(newCount));
      setCardCountError(null);
      return newCount;
    });
  }, [availableTermCount, selectedCollectionId]);

  useEffect(() => {
    if (step !== "setup") return;

    let cancelled = false;
    setPoolStats(null);

    void getReviewPoolStatsAction(domainIds).then((result) => {
      if (cancelled) return;
      if ("poolStats" in result && result.poolStats) {
        setPoolStats(result.poolStats);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [domainIds, step, statsRefreshKey]);

  const currentSetup = useMemo(
    (): ReviewSetup => ({
      domainIds,
      cardCount,
    }),
    [domainIds, cardCount],
  );

  const currentCard = cards[currentIndex];
  const currentRevealed = currentCard ? revealedTermIds.includes(currentCard.id) : false;
  const currentRating = currentCard
    ? ratings.find((rating) => rating.termId === currentCard.id)
    : undefined;

  const persistSession = useCallback(
    (state: {
      cards: ReviewTerm[];
      currentIndex: number;
      ratings: ReviewRating[];
      revealedTermIds: string[];
      setup: ReviewSetup;
      startedAt: string;
    }) => {
      saveReviewSession({
        setup: state.setup,
        cards: state.cards,
        currentIndex: state.currentIndex,
        ratings: state.ratings,
        revealedTermIds: state.revealedTermIds,
        startedAt: state.startedAt,
      });
      setSavedSession(loadReviewSession());
    },
    [],
  );

  const [sessionStartedAt, setSessionStartedAt] = useState<string>(new Date().toISOString());

  useEffect(() => {
    if (step !== "playing" || cards.length === 0) return;

    persistSession({
      setup: currentSetup,
      cards,
      currentIndex,
      ratings,
      revealedTermIds,
      startedAt: sessionStartedAt,
    });
  }, [
    step,
    cards,
    currentIndex,
    ratings,
    revealedTermIds,
    currentSetup,
    sessionStartedAt,
    persistSession,
  ]);

  function resetToSetup() {
    setStep("setup");
    setCards([]);
    setCurrentIndex(0);
    setRatings([]);
    setRevealedTermIds([]);
    setShownTermIds([]);
    setErrorMessage(null);
    setSavedSession(loadReviewSession());
    setStatsRefreshKey((key) => key + 1);
  }

  function finishSession(finalRatings: ReviewRating[]) {
    setRatings(finalRatings);
    clearReviewSession();
    setSavedSession(null);
    setStep("summary");
  }

  function handleResumeSession() {
    if (!savedSession) return;

    setSelectedCollectionId(
      savedSession.setup.domainIds === "all" ? "all" : savedSession.setup.domainIds[0],
    );
    setCardCount(savedSession.setup.cardCount);
    setCards(savedSession.cards);
    setCurrentIndex(savedSession.currentIndex);
    setRatings(savedSession.ratings);
    setRevealedTermIds(savedSession.revealedTermIds);
    setShownTermIds(savedSession.revealedTermIds);
    setSessionStartedAt(savedSession.startedAt);
    setErrorMessage(null);
    setStep("playing");
  }

  function handleDiscardSession() {
    clearReviewSession();
    setSavedSession(null);
  }

  function handleStartReview() {
    setErrorMessage(null);
    clearReviewSession();
    setSavedSession(null);

    startReview(async () => {
      const result = await startReviewAction(currentSetup);

      if ("error" in result) {
        setErrorMessage(result.error ?? "Couldn't start the review. Try again.");
        return;
      }

      const startedAt = new Date().toISOString();
      setSessionStartedAt(startedAt);
      setCards(result.cards);
      setCurrentIndex(0);
      setRatings([]);
      setRevealedTermIds([]);
      setShownTermIds([]);
      setStep("playing");

      persistSession({
        setup: currentSetup,
        cards: result.cards,
        currentIndex: 0,
        ratings: [],
        revealedTermIds: [],
        startedAt,
      });
    });
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
    finishSession(ratings);
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

    finishSession(nextRatings);
  }

  function handleDone() {
    finishSession(ratings);
  }

  function applyCardCount(value: number) {
    setCardCount(value);
    setCardCountInput(String(value));
    setCardCountError(null);
  }

  useReviewKeyboard({
    onReveal: handleReveal,
    onGrade: (grade) => void handleRate(grade),
    onPrevious: handlePrevious,
    onNext: handleNext,
    revealed: currentRevealed,
    canRate: currentRevealed && !isRating,
    enabled: step === "playing",
  });

  const retainedCount = ratings.filter((rating) => rating.grade >= GOOD).length;
  const forgotCount = ratings.length - retainedCount;

  const cardCountPresets = studyCountPresetValues(maxCardCount);

  return (
    <>
      {step === "setup" ? (
        <QuizPanel className="flex max-h-full min-h-0 w-full flex-col">
          {collections.length === 0 ? (
            <StudyNoActiveCollectionsState description="Turn on a collection on the collection page before you start reviewing." />
          ) : (
            <StudySetupPanel
              footer={
                <Button
                  type="button"
                  onPress={handleStartReview}
                  isDisabled={availableTermCount === 0 || isStarting || cardCountError !== null}
                  className="min-h-11 w-full"
                >
                  {isStarting ? "Starting…" : "Start review"}
                </Button>
              }
            >
              <QuizPanelLabel
                title="Set up your review"
                description="Pick what to study and how many terms."
              />
              {savedSession ? (
                <StudyResumeBanner
                  message={
                    <>
                      You have an in-progress session — term{" "}
                      <span className="tabular-nums">{savedSession.currentIndex + 1}</span> of{" "}
                      <span className="tabular-nums">{savedSession.cards.length}</span>.
                    </>
                  }
                  onResume={handleResumeSession}
                  onDiscard={handleDiscardSession}
                />
              ) : null}

              <StudyCollectionField
                id="review-collection"
                collections={collections}
                value={selectedCollectionId}
                onChange={setSelectedCollectionId}
              />

              <QuizStat
                value={
                  <>
                    {availableTermCount === 1
                      ? "1 term available"
                      : `${availableTermCount} terms available`}
                    <ReviewPoolBreakdown stats={poolStats} />
                  </>
                }
              />

              <StudyCountField
                id="review-term-count"
                label="How many terms"
                presets={cardCountPresets}
                selectedValue={cardCount}
                inputValue={cardCountInput}
                error={cardCountError}
                max={maxCardCount}
                availableCount={availableTermCount}
                perUnitLabel="session"
                onPresetSelect={applyCardCount}
                onInputChange={(value) => {
                  setCardCountInput(value);

                  if (value === "") {
                    setCardCountError(null);
                    return;
                  }

                  const parsed = Number.parseInt(value, 10);
                  if (Number.isNaN(parsed) || parsed < 1 || parsed > maxCardCount) {
                    setCardCountError(`Please enter a number between 1 and ${maxCardCount}`);
                  } else {
                    setCardCount(parsed);
                    setCardCountError(null);
                  }
                }}
              />

              {availableTermCount === 0 ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    No terms in your selection. Pick another collection or{" "}
                    <LinkButton href="/jargon" variant="link" className="h-auto min-h-0 p-0">
                      activate one
                    </LinkButton>
                    .
                  </AlertDescription>
                </Alert>
              ) : null}

              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}
            </StudySetupPanel>
          )}
        </QuizPanel>
      ) : null}

      {step === "playing" && currentCard ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex shrink-0 items-center gap-3">
            <StudyProgress
              current={currentIndex + 1}
              total={cards.length}
              unitLabel="Term"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onPress={handleDone}
              className="min-h-11 shrink-0 transition-transform active:scale-[0.96]"
            >
              Done
            </Button>
          </div>

          <ReviewCard
            term={currentCard}
            revealed={currentRevealed}
            onReveal={handleReveal}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onMarkedKnown={handleMarkedKnown}
            reduceMotion={reduceMotion}
            swipeEnabled
            narrationAccess={narrationAccess}
          />

          <div className="shrink-0 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                onPress={handlePrevious}
                isDisabled={currentIndex === 0}
                className="min-h-11 min-w-11 transition-transform active:scale-[0.96]"
                aria-label="Previous term"
              >
                <ChevronLeft className="size-4" aria-hidden strokeWidth={1.5} />
              </Button>

              {currentRevealed ? (
                <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                  {GRADE_BUTTONS.map(({ grade, variant }) => (
                    <Button
                      key={grade}
                      type="button"
                      variant={variant}
                      onPress={() => void handleRate(grade)}
                      isDisabled={isRating}
                      className={cn(
                        "btn-soft min-h-11 transition-transform active:scale-[0.96]",
                        "[--btn-bg:color-mix(in_oklab,var(--btn-color)_45%,var(--color-base-100))]",
                        "[--btn-border:color-mix(in_oklab,var(--btn-color)_55%,var(--color-base-100))]",
                        "[color:var(--btn-fg)]",
                        currentRating?.grade === grade && "ring-2 ring-primary/50",
                      )}
                    >
                      {GRADE_LABELS[grade]}
                    </Button>
                  ))}
                </div>
              ) : (
                <span className="flex-1" />
              )}

              <Button
                type="button"
                variant="ghost"
                onPress={handleNext}
                isDisabled={currentIndex >= cards.length - 1}
                className="min-h-11 min-w-11 transition-transform active:scale-[0.96]"
                aria-label="Next term"
              >
                <ChevronRight className="size-4" aria-hidden strokeWidth={1.5} />
              </Button>
            </div>

            <p className="m-0 hidden text-center text-xs text-base-content/50 md:block coarse:hidden">
              <QuizKeyboardHint action="reveal" />
              {" · "}
              <kbd className="kbd kbd-xs">1</kbd>-<kbd className="kbd kbd-xs">4</kbd> grade ·{" "}
              <kbd className="kbd kbd-xs">←</kbd>
              <kbd className="kbd kbd-xs">→</kbd>
            </p>
          </div>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}

      {step === "summary" ? (
        <ReviewSummary
          reviewedCount={ratings.length}
          retainedCount={retainedCount}
          forgotCount={forgotCount}
          onReviewAgain={resetToSetup}
        />
      ) : null}
    </>
  );
}
