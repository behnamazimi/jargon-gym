"use client";

import { useCallback, useRef, useState } from "react";
import { ReadCaughtUp } from "@/components/read/read-caught-up";
import { ReadErrorAlert } from "@/components/read/read-error-alert";
import { ReviewOptionsMenu } from "@/components/review/review-options-menu";
import { ReviewCollectionSettings } from "@/components/review/review-collection-settings";
import { ReviewPlayingStep } from "@/components/review/review-playing-step";
import { useReviewGrading } from "@/components/review/use-review-grading";
import { useReviewKeyboard } from "@/components/review/use-review-keyboard";
import { useReviewOptions } from "@/components/review/use-review-options";
import { useReviewQueue } from "@/components/review/use-review-queue";
import { useReviewWriteQueue } from "@/components/review/use-review-write-queue";
import { StudyNoActiveCollectionsState } from "@/components/read/study/study-paused-state";
import { QuizPanel } from "@/components/quiz/quiz-ui";
import type { TermNarrationHandle } from "@/components/terms/term-narration-player";
import { LinkButton } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  clearReviewCollectionPreference,
  saveReviewCollectionPreference,
} from "@/lib/review/collection-preference";
import { IDLE_WAKE_MS, useKeepAwakeAvailable, useWakeLock } from "@/hooks/use-wake-lock";
import type { ReviewOptions } from "@/lib/review/options";
import type { ReviewQueueSeed } from "@/lib/review/types";
import type { PausedStudyCollection, StudyCollection } from "@/lib/study/types";
import { LEARNING_STEP_MAX_RETRIES } from "@/lib/trace";

type ReviewPageProps = {
  seed: ReviewQueueSeed;
  collections: StudyCollection[];
  paused: PausedStudyCollection[];
  collectionId: string;
  narrationAccess: boolean;
  initialOptions: ReviewOptions;
};

function stripReviewCollectionParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("collection")) return;
  url.searchParams.delete("collection");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function caughtUpDescription(collectionId: string, collections: StudyCollection[]) {
  if (collectionId === "all") {
    return "No terms in your active collections. Add some terms or resume a collection to start reviewing.";
  }
  const name = collections.find((collection) => collection.id === collectionId)?.name;
  if (!name) {
    return "No terms in this collection. Pick another to keep reviewing.";
  }
  return `No terms in ${name}. Pick another collection to keep reviewing.`;
}

export function ReviewPage({
  seed,
  collections,
  paused,
  collectionId,
  narrationAccess,
  initialOptions,
}: ReviewPageProps) {
  const reduceMotion = usePrefersReducedMotion();
  const { options, changeOption } = useReviewOptions(initialOptions);
  const keepAwakeAvailable = useKeepAwakeAvailable();
  useWakeLock(options.keepAwake && keepAwakeAvailable, { idleMs: IDLE_WAKE_MS });
  const [selectedCollectionId, setSelectedCollectionId] = useState(collectionId);
  const [rememberOnDevice, setRememberOnDevice] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const queue = useReviewQueue({ collectionId: selectedCollectionId, seed });
  const { enqueueRating } = useReviewWriteQueue({ setErrorMessage });
  const selectedCollectionIdRef = useRef(selectedCollectionId);
  const narrationRef = useRef<TermNarrationHandle>(null);

  selectedCollectionIdRef.current = selectedCollectionId;

  const currentCard = queue.currentTerm;
  const { currentRevealed, currentRating, handleReveal, handleNext, handleRate } = useReviewGrading(
    {
      queue,
      enqueueRating,
      setErrorMessage,
      narrateOnReveal: options.narrateOnReveal,
      narrationAccess,
      narrationRef,
    },
  );

  const handleCollectionChange = useCallback(
    (nextCollectionId: string) => {
      if (nextCollectionId === selectedCollectionIdRef.current) return;
      setSelectedCollectionId(nextCollectionId);
      selectedCollectionIdRef.current = nextCollectionId;
      stripReviewCollectionParam();
      queue.switchCollection(nextCollectionId);
      if (rememberOnDevice) {
        saveReviewCollectionPreference(nextCollectionId);
      }
    },
    [queue.switchCollection, rememberOnDevice],
  );

  const handleRememberChange = useCallback((remember: boolean) => {
    setRememberOnDevice(remember);
    if (remember) {
      saveReviewCollectionPreference(selectedCollectionIdRef.current);
    } else {
      clearReviewCollectionPreference();
    }
  }, []);

  const handlePrevious = useCallback(() => {
    queue.goPrevious();
  }, [queue.goPrevious]);

  const handleMarkedKnown = useCallback(() => {
    void queue.goNext();
  }, [queue.goNext]);

  useReviewKeyboard({
    onReveal: handleReveal,
    onGrade: handleRate,
    onPrevious: handlePrevious,
    onNext: handleNext,
    revealed: currentRevealed,
    rated: currentRating !== undefined,
    enabled: currentCard !== null,
  });

  if (collections.length === 0) {
    return (
      <QuizPanel className="flex max-h-full min-h-0 w-full flex-col">
        <StudyNoActiveCollectionsState paused={paused} activity="reviewing" />
      </QuizPanel>
    );
  }

  const collectionControl = (
    <ReviewCollectionSettings
      collections={collections}
      selectedCollectionId={selectedCollectionId}
      rememberOnDevice={rememberOnDevice}
      onCollectionChange={handleCollectionChange}
      onRememberChange={handleRememberChange}
    />
  );

  const optionsControl = (
    <ReviewOptionsMenu
      options={options}
      narrationAccess={narrationAccess}
      onChange={(key, value) => void changeOption(key, value)}
    />
  );
  const topBar = (
    <div className="flex shrink-0 items-center justify-between gap-2">
      {collectionControl}
      {optionsControl}
    </div>
  );

  if (queue.status === "error" && !currentCard) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {topBar}
        <ReadErrorAlert
          message={queue.errorMessage ?? "Couldn't load the next term. Try again."}
          isPending={queue.isFetchingMore}
          onRetry={queue.retry}
        />
      </div>
    );
  }

  if (queue.status === "loading") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {topBar}
        <QuizPanel>
          <div className="flex items-center gap-3 px-5 py-5 sm:px-6">
            <span className="loading loading-spinner loading-sm text-base-content/70" />
            <p className="m-0 text-sm text-base-content/70">Finding terms to review.</p>
          </div>
        </QuizPanel>
      </div>
    );
  }

  if (queue.status === "caughtUp" || !currentCard) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {topBar}
        <ReadCaughtUp
          goal={{ tier: "review", collectionId: selectedCollectionId }}
          title="No terms to review"
          description={caughtUpDescription(selectedCollectionId, collections)}
          actions={
            selectedCollectionId === "all" ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <LinkButton href="/app/library" variant="outline">
                  Go to library
                </LinkButton>
                <LinkButton href="/app/import" variant="outline">
                  Add your own terms
                </LinkButton>
              </div>
            ) : null
          }
        />
      </div>
    );
  }

  return (
    <ReviewPlayingStep
      currentCard={currentCard}
      canGoBack={queue.canGoBack}
      currentRevealed={currentRevealed}
      currentRating={currentRating}
      errorMessage={errorMessage ?? queue.errorMessage}
      reduceMotion={reduceMotion}
      narrationAccess={narrationAccess}
      swipeEnabled={options.swipe}
      showNextReview={options.showNextReview}
      willRetry={currentCard ? (currentCard.visit ?? 0) < LEARNING_STEP_MAX_RETRIES : false}
      collectionControl={collectionControl}
      optionsControl={optionsControl}
      narrationHandleRef={narrationRef}
      onReveal={handleReveal}
      onPrevious={handlePrevious}
      onNext={handleNext}
      onMarkedKnown={handleMarkedKnown}
      onRate={handleRate}
    />
  );
}
