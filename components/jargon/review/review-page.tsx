"use client";

import { AlertCircle, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MAX_REVIEW_TERMS, getMaxReviewCardCount } from "@/lib/review/terms";
import {
  QuizCenteredState,
  QuizKeyboardHint,
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
  QuizSetupFooter,
  QuizSetupOption,
  QuizStat,
} from "@/components/jargon/quiz/quiz-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { rateReviewTermAction, startReviewAction } from "@/app/(private)/jargon/review/actions";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";
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
import { countTermsForSelection } from "@/lib/quiz/terms";
import type { QuizableCollection, QuizTermStatus } from "@/lib/quiz/types";
import { cn } from "@/lib/utils";

type ReviewStep = "setup" | "playing" | "summary";

type ReviewPageProps = {
  collections: QuizableCollection[];
};

const DEFAULT_CARD_COUNT = 10;

function termCountForCollection(collection: QuizableCollection, status: QuizTermStatus) {
  return status === "known" ? collection.knownCount : collection.unknownCount;
}

function allCollectionsTermCount(collections: QuizableCollection[], status: QuizTermStatus) {
  return collections.reduce(
    (total, collection) => total + termCountForCollection(collection, status),
    0,
  );
}

function upsertRating(ratings: ReviewRating[], termId: string, known: boolean): ReviewRating[] {
  const without = ratings.filter((rating) => rating.termId !== termId);
  return [...without, { termId, known }];
}

export function ReviewPage({ collections }: ReviewPageProps) {
  const reduceMotion = usePrefersReducedMotion();

  const [step, setStep] = useState<ReviewStep>("setup");
  const [status, setStatus] = useState<QuizTermStatus>("unknown");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("all");
  const [cardCount, setCardCount] = useState(DEFAULT_CARD_COUNT);
  const [shuffle, setShuffle] = useState(true);
  const [cards, setCards] = useState<ReviewTerm[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<ReviewRating[]>([]);
  const [revealedTermIds, setRevealedTermIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [savedSession, setSavedSession] = useState<ReviewSessionState | null>(null);
  const [sessionStatus, setSessionStatus] = useState<QuizTermStatus>("unknown");

  const domainIds = selectedCollectionId === "all" ? "all" : [selectedCollectionId];

  const availableTermCount = useMemo(
    () => countTermsForSelection(collections, domainIds, status),
    [collections, domainIds, status],
  );

  const maxCardCount = getMaxReviewCardCount(availableTermCount);

  useEffect(() => {
    setSavedSession(loadReviewSession());
  }, []);

  useEffect(() => {
    if (availableTermCount === 0) return;
    setCardCount((current) => {
      const next = Math.min(
        Math.max(DEFAULT_CARD_COUNT, 1),
        getMaxReviewCardCount(availableTermCount),
      );
      return Math.min(current, next) || next;
    });
  }, [availableTermCount, status, selectedCollectionId]);

  const currentSetup = useMemo(
    (): ReviewSetup => ({
      domainIds,
      status,
      cardCount,
      shuffle,
    }),
    [domainIds, status, cardCount, shuffle],
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
    setErrorMessage(null);
    setSavedSession(loadReviewSession());
  }

  function finishSession(finalRatings: ReviewRating[]) {
    setRatings(finalRatings);
    clearReviewSession();
    setSavedSession(null);
    setStep("summary");
  }

  function handleResumeSession() {
    if (!savedSession) return;

    setStatus(savedSession.setup.status);
    setSelectedCollectionId(
      savedSession.setup.domainIds === "all" ? "all" : savedSession.setup.domainIds[0],
    );
    setCardCount(savedSession.setup.cardCount);
    setShuffle(savedSession.setup.shuffle);
    setCards(savedSession.cards);
    setCurrentIndex(savedSession.currentIndex);
    setRatings(savedSession.ratings);
    setRevealedTermIds(savedSession.revealedTermIds);
    setSessionStartedAt(savedSession.startedAt);
    setSessionStatus(savedSession.setup.status);
    setErrorMessage(null);
    setStep("playing");
  }

  function handleDiscardSession() {
    clearReviewSession();
    setSavedSession(null);
  }

  async function handleStartReview() {
    setErrorMessage(null);
    setIsStarting(true);

    clearReviewSession();
    setSavedSession(null);

    const result = await startReviewAction(currentSetup);

    setIsStarting(false);

    if ("error" in result) {
      setErrorMessage(result.error ?? "Failed to start review.");
      return;
    }

    const startedAt = new Date().toISOString();
    setSessionStartedAt(startedAt);
    setSessionStatus(currentSetup.status);
    setCards(result.cards);
    setCurrentIndex(0);
    setRatings([]);
    setRevealedTermIds([]);
    setStep("playing");

    persistSession({
      setup: currentSetup,
      cards: result.cards,
      currentIndex: 0,
      ratings: [],
      revealedTermIds: [],
      startedAt,
    });
  }

  function handleReveal() {
    if (!currentCard || currentRevealed) return;
    setRevealedTermIds((ids) => [...ids, currentCard.id]);
  }

  function handlePrevious() {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }

  function handleNext() {
    setCurrentIndex((index) => Math.min(cards.length - 1, index + 1));
  }

  async function handleRate(retained: boolean) {
    if (!currentCard || !currentRevealed || isRating) return;

    const shouldMarkKnown = sessionStatus === "unknown" && retained;
    const shouldClearKnown = sessionStatus === "known" && !retained;

    if (shouldMarkKnown || shouldClearKnown) {
      setIsRating(true);
      const result = await rateReviewTermAction(currentCard.id, shouldMarkKnown);
      setIsRating(false);

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
    }

    const nextRatings = upsertRating(ratings, currentCard.id, retained);
    setRatings(nextRatings);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    finishSession(nextRatings);
  }

  function handleDone() {
    finishSession(ratings);
  }

  const isKnownRefresh = sessionStatus === "known";
  const positiveLabel = isKnownRefresh ? "Still know it" : "Got it";
  const negativeLabel = isKnownRefresh ? "Forgot it" : "Still learning";

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

  return (
    <PageShell innerClassName="space-y-8">
      <PageHeader
        icon={BookOpen}
        title="Review"
        description="Flashcard-style recall for terms in your active collections."
      />

      {step === "setup" ? (
        <QuizPanel>
          {collections.length === 0 ? (
            <QuizPanelBody>
              <QuizCenteredState
                icon={AlertCircle}
                title="No active collections"
                description="Resume a collection on the jargon page before starting a review session."
              >
                <LinkButton href="/jargon">Back to jargon</LinkButton>
              </QuizCenteredState>
            </QuizPanelBody>
          ) : (
            <>
              <QuizPanelHeader
                icon={BookOpen}
                title="Set up your review"
                description="Choose what to review and how many cards to study."
              />
              <QuizPanelBody>
                {savedSession ? (
                  <Alert>
                    <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        You have an in-progress session — card{" "}
                        <span className="tabular-nums">{savedSession.currentIndex + 1}</span> of{" "}
                        <span className="tabular-nums">{savedSession.cards.length}</span>.
                      </span>
                      <span className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" onPress={handleResumeSession}>
                          Resume
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onPress={handleDiscardSession}
                        >
                          Start new
                        </Button>
                      </span>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <fieldset className="mb-4 flex max-w-md flex-col gap-2 border-0 p-0">
                  <legend className="mb-2 text-sm leading-none font-medium">What to review</legend>
                  <div className="flex flex-col gap-3">
                    <QuizSetupOption
                      name="review-status"
                      value="unknown"
                      checked={status === "unknown"}
                      onChange={() => setStatus("unknown")}
                      title="Unknown terms"
                      description="Focus on terms you have not marked as known yet."
                    />
                    <QuizSetupOption
                      name="review-status"
                      value="known"
                      checked={status === "known"}
                      onChange={() => setStatus("known")}
                      title="Known terms"
                      description="Refresh terms you already know."
                    />
                  </div>
                </fieldset>

                <Field className="max-w-md">
                  <FieldLabel htmlFor="review-collection">Collection</FieldLabel>
                  <Select
                    selectedKey={selectedCollectionId}
                    onSelectionChange={(key) => setSelectedCollectionId(String(key))}
                  >
                    <SelectTrigger id="review-collection" className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem id="all">
                        All active collections ({allCollectionsTermCount(collections, status)})
                      </SelectItem>
                      {collections.map((collection) => (
                        <SelectItem key={collection.id} id={collection.id}>
                          {collection.name} ({termCountForCollection(collection, status)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <QuizStat
                  label="Terms available"
                  value={
                    availableTermCount === 0
                      ? "None"
                      : `${availableTermCount} term${availableTermCount === 1 ? "" : "s"}`
                  }
                />

                <Field className="max-w-md">
                  <FieldLabel htmlFor="review-card-count">Cards in this session</FieldLabel>
                  <Input
                    id="review-card-count"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={maxCardCount}
                    value={String(cardCount)}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      if (Number.isNaN(parsed)) return;
                      setCardCount(Math.min(Math.max(1, parsed), maxCardCount || 1));
                    }}
                    disabled={availableTermCount === 0}
                    className="max-w-[8rem] tabular-nums"
                  />
                  <FieldDescription>
                    Choose 1–{maxCardCount || 1}
                    {availableTermCount > MAX_REVIEW_TERMS
                      ? ` (${MAX_REVIEW_TERMS} max per session).`
                      : "."}
                  </FieldDescription>
                </Field>

                <label className="flex max-w-md cursor-pointer items-start gap-3 py-1">
                  <input
                    type="checkbox"
                    checked={shuffle}
                    onChange={(event) => setShuffle(event.target.checked)}
                    className="checkbox checkbox-primary checkbox-sm mt-0.5 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-none font-medium">Shuffle cards</span>
                    <span className="mt-1.5 block text-xs leading-relaxed text-base-content/60">
                      Randomize order. Turn off for alphabetical order.
                    </span>
                  </span>
                </label>

                {availableTermCount === 0 ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      No {status} terms in the selected collection
                      {selectedCollectionId === "all" ? "s" : ""}. Choose a different option or{" "}
                      <LinkButton href="/jargon" variant="link" className="h-auto min-h-0 p-0">
                        activate a collection
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

                <QuizSetupFooter hint="End the session anytime with Done — your progress is saved as you go.">
                  <Button
                    type="button"
                    onPress={handleStartReview}
                    isDisabled={availableTermCount === 0 || isStarting}
                    className="w-full max-w-md"
                  >
                    {isStarting ? "Starting…" : "Start review"}
                  </Button>
                </QuizSetupFooter>
              </QuizPanelBody>
            </>
          )}
        </QuizPanel>
      ) : null}

      {step === "playing" && currentCard ? (
        <div className="mx-auto w-full max-w-lg space-y-4">
          <div className="flex items-center gap-3">
            <ReviewProgress current={currentIndex + 1} total={cards.length} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onPress={handleDone}
              className="shrink-0 transition-transform active:scale-[0.96]"
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

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onPress={handlePrevious}
                isDisabled={currentIndex === 0}
                className="transition-transform active:scale-[0.96]"
                aria-label="Previous card"
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
                      "min-w-[7rem] flex-1 transition-transform active:scale-[0.96] sm:flex-none",
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
                      "min-w-[7rem] flex-1 transition-transform active:scale-[0.96] sm:flex-none",
                      currentRating?.known === false && "ring-2 ring-primary/30",
                    )}
                  >
                    {negativeLabel}
                  </Button>
                </div>
              ) : (
                <p className="m-0 flex-1 text-center text-xs text-base-content/50 sm:text-sm">
                  Tap the card to reveal
                </p>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onPress={handleNext}
                isDisabled={currentIndex >= cards.length - 1}
                className="transition-transform active:scale-[0.96]"
                aria-label="Next card"
              >
                <ChevronRight className="size-4" aria-hidden strokeWidth={1.5} />
              </Button>
            </div>

            <p className="m-0 hidden text-center text-xs text-base-content/50 sm:block">
              <QuizKeyboardHint action="reveal" />
              {" · "}
              <kbd className="kbd kbd-xs">1</kbd> {positiveLabel.toLowerCase()} ·{" "}
              <kbd className="kbd kbd-xs">2</kbd> {negativeLabel.toLowerCase()} ·{" "}
              <kbd className="kbd kbd-xs">←</kbd>
              <kbd className="kbd kbd-xs">→</kbd> navigate
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
        <div className="mx-auto w-full max-w-2xl">
          <ReviewSummary
            reviewedCount={ratings.length}
            sessionStatus={sessionStatus}
            retainedCount={retainedCount}
            forgotCount={forgotCount}
            onReviewAgain={resetToSetup}
          />
        </div>
      ) : null}
    </PageShell>
  );
}
