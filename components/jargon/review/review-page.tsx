"use client";

import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { countTermsForMixedSelection, getMaxStudyCount } from "@/lib/study/count";
import { MAX_STUDY_TERMS, type StudyCollection } from "@/lib/study/types";
import {
  QuizCenteredState,
  QuizKeyboardHint,
  QuizPanel,
  QuizPanelBody,
  QuizPanelLabel,
  QuizSetupFooter,
  QuizStat,
} from "@/components/jargon/quiz/quiz-ui";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { recordReviewRevealAction } from "@/app/(private)/jargon/actions";
import {
  getReviewPoolStatsAction,
  rateReviewTermAction,
  startReviewAction,
} from "@/app/(private)/jargon/review/actions";
import { ReviewCard } from "@/components/jargon/review/review-card";
import { ReviewProgress } from "@/components/jargon/review/review-progress";
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
};

const DEFAULT_CARD_COUNT = 10;

function termCountForCollection(collection: StudyCollection) {
  return collection.knownCount + collection.unknownCount;
}

function allCollectionsTermCount(collections: StudyCollection[]) {
  return collections.reduce((total, collection) => total + termCountForCollection(collection), 0);
}

function upsertRating(ratings: ReviewRating[], termId: string, known: boolean): ReviewRating[] {
  const without = ratings.filter((rating) => rating.termId !== termId);
  return [...without, { termId, known }];
}

function ReviewPoolBreakdown({
  stats,
}: {
  stats: {
    unseen: number;
    seen: number;
    stale: number;
    total: number;
  } | null;
}) {
  const unseen = stats?.unseen ?? 0;
  const seen = stats?.seen ?? 0;
  const stale = stats?.stale ?? 0;
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
      <span className="font-medium tabular-nums">{stale}</span> stale
      {" · "}
      <span className="font-medium tabular-nums">
        {seen}/{total}
      </span>{" "}
      covered
    </p>
  );
}

function cardCountPresetValues(maxCardCount: number): number[] {
  if (maxCardCount < 1) return [];
  const values = [5, 10, maxCardCount].filter((value) => value >= 1 && value <= maxCardCount);
  return [...new Set(values)].sort((a, b) => a - b);
}

export function ReviewPage({ collections, initialDomainId }: ReviewPageProps) {
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
    stale: number;
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
    () => countTermsForMixedSelection(collections, domainIds),
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

  async function handleRate(retained: boolean) {
    if (!currentCard || !currentRevealed || isRating) return;

    const alreadyRated = ratings.some((rating) => rating.termId === currentCard.id);

    setIsRating(true);
    const result = await rateReviewTermAction(currentCard.id, retained, currentCard.originStatus);
    setIsRating(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    const nextRatings = upsertRating(ratings, currentCard.id, retained);
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

  const positiveLabel = "Got it";
  const negativeLabel = "Missed it";

  useReviewKeyboard({
    onReveal: handleReveal,
    onRateKnown: () => void handleRate(true),
    onRateLearning: () => void handleRate(false),
    onPrevious: handlePrevious,
    onNext: handleNext,
    revealed: currentRevealed,
    canRate: currentRevealed && !isRating,
    enabled: step === "playing",
  });

  const retainedCount = ratings.filter((rating) => rating.known).length;
  const forgotCount = ratings.length - retainedCount;

  const cardCountPresets = cardCountPresetValues(maxCardCount);

  return (
    <>
      {step === "setup" ? (
        <QuizPanel className="flex max-h-full min-h-0 w-full flex-col">
          {collections.length === 0 ? (
            <QuizPanelBody>
              <QuizCenteredState
                icon={AlertCircle}
                title="No active collections"
                description="Turn on a collection on the collection page before you start reviewing."
              >
                <LinkButton href="/jargon" variant="outline" className="min-h-11">
                  Collections
                </LinkButton>
              </QuizCenteredState>
            </QuizPanelBody>
          ) : (
            <>
              <QuizPanelBody className="min-h-0 flex-1 overflow-y-auto">
                <QuizPanelLabel
                  title="Set up your review"
                  description="Pick what to study and how many terms."
                />
                {savedSession ? (
                  <Alert>
                    <AlertDescription>
                      You have an in-progress session — term{" "}
                      <span className="tabular-nums">{savedSession.currentIndex + 1}</span> of{" "}
                      <span className="tabular-nums">{savedSession.cards.length}</span>.
                    </AlertDescription>
                    <AlertAction>
                      <Button
                        type="button"
                        size="sm"
                        onPress={handleResumeSession}
                        className="max-md:min-h-11"
                      >
                        Resume
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onPress={handleDiscardSession}
                        className="max-md:min-h-11"
                      >
                        Start new
                      </Button>
                    </AlertAction>
                  </Alert>
                ) : null}

                <Field>
                  <FieldLabel htmlFor="review-collection">Collection</FieldLabel>
                  <Select
                    value={selectedCollectionId}
                    onChange={(key) => setSelectedCollectionId(String(key))}
                  >
                    <SelectTrigger id="review-collection" size="sm" className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem id="all">
                        All active collections ({allCollectionsTermCount(collections)})
                      </SelectItem>
                      {collections.map((collection) => (
                        <SelectItem key={collection.id} id={collection.id}>
                          {collection.name} ({termCountForCollection(collection)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

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

                <Field>
                  <FieldLabel htmlFor="review-term-count">How many terms</FieldLabel>
                  <div className="flex w-full items-stretch gap-2">
                    {cardCountPresets.map((preset) => {
                      const selected = cardCount === preset && cardCountError === null;
                      return (
                        <Button
                          key={preset}
                          type="button"
                          variant="outline"
                          onPress={() => applyCardCount(preset)}
                          isDisabled={availableTermCount === 0}
                          aria-pressed={selected}
                          className={cn(
                            "min-h-11 tabular-nums",
                            selected &&
                              "border-primary bg-primary/10 text-primary hover:bg-primary/15",
                          )}
                        >
                          {preset}
                        </Button>
                      );
                    })}
                    <Input
                      id="review-term-count"
                      type="text"
                      inputMode="numeric"
                      value={cardCountInput}
                      onChange={(event) => {
                        const value = event.target.value;
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
                      disabled={availableTermCount === 0}
                      className="min-h-11 min-w-16 flex-1 tabular-nums"
                    />
                  </div>
                  <FieldDescription>
                    {cardCountError ? (
                      <span className="text-error">{cardCountError}</span>
                    ) : (
                      <>
                        Choose 1–{maxCardCount || 1}
                        {availableTermCount > MAX_STUDY_TERMS
                          ? ` (${MAX_STUDY_TERMS} max per session).`
                          : "."}
                      </>
                    )}
                  </FieldDescription>
                </Field>

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
              </QuizPanelBody>
              <QuizSetupFooter className="sticky bottom-0 shrink-0 bg-base-100 px-5 py-4 sm:px-6">
                <Button
                  type="button"
                  onPress={handleStartReview}
                  isDisabled={availableTermCount === 0 || isStarting || cardCountError !== null}
                  className="min-h-11 w-full"
                >
                  {isStarting ? "Starting…" : "Start review"}
                </Button>
              </QuizSetupFooter>
            </>
          )}
        </QuizPanel>
      ) : null}

      {step === "playing" && currentCard ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex shrink-0 items-center gap-3">
            <ReviewProgress current={currentIndex + 1} total={cards.length} />
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
            reduceMotion={reduceMotion}
            swipeEnabled
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
                <div className="flex flex-1 flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    onPress={() => void handleRate(true)}
                    isDisabled={isRating}
                    className={cn(
                      "min-h-11 min-w-[7rem] flex-1 transition-transform active:scale-[0.96] md:flex-none",
                      currentRating?.known === true && "btn-primary",
                    )}
                  >
                    {positiveLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onPress={() => void handleRate(false)}
                    isDisabled={isRating}
                    className={cn(
                      "min-h-11 min-w-[7rem] flex-1 transition-transform active:scale-[0.96] md:flex-none",
                      currentRating?.known === false && "ring-2 ring-primary/30",
                    )}
                  >
                    {negativeLabel}
                  </Button>
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
              <kbd className="kbd kbd-xs">1</kbd> {positiveLabel.toLowerCase()} ·{" "}
              <kbd className="kbd kbd-xs">2</kbd> {negativeLabel.toLowerCase()} ·{" "}
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
