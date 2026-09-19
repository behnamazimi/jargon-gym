"use client";

import { useCallback, useRef, useState } from "react";
import { recordReviewRevealAction } from "@/app/(private)/jargon/actions";
import type { ReviewQueueSeed } from "@/app/(private)/jargon/review/actions";
import { ReadCaughtUp } from "@/components/jargon/read/read-caught-up";
import { ReadErrorAlert } from "@/components/jargon/read/read-error-alert";
import { ReviewCollectionSettings } from "@/components/jargon/review/review-collection-settings";
import { ReviewPlayingStep } from "@/components/jargon/review/review-playing-step";
import { useReviewKeyboard } from "@/components/jargon/review/use-review-keyboard";
import { useReviewQueue } from "@/components/jargon/review/use-review-queue";
import { useReviewWriteQueue } from "@/components/jargon/review/use-review-write-queue";
import { StudyNoActiveCollectionsState } from "@/components/jargon/study/study-setup-panel";
import { QuizPanel } from "@/components/jargon/quiz/quiz-ui";
import { LinkButton } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  clearReviewCollectionPreference,
  saveReviewCollectionPreference,
} from "@/lib/review/collection-preference";
import { upsertRating } from "@/lib/review/writes";
import type { ReviewRating } from "@/lib/review/types";
import type { StudyCollection } from "@/lib/study/types";
import type { ReviewGrade } from "@/lib/trace";

type ReviewPageProps = {
  seed: ReviewQueueSeed;
  collections: StudyCollection[];
  domainId: string;
  narrationAccess: boolean;
};

function stripReviewDomainParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("domain")) return;
  url.searchParams.delete("domain");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function caughtUpDescription(domainId: string, collections: StudyCollection[]) {
  if (domainId === "all") {
    return "Nothing left to recall in your active collections right now. Come back later, or import more terms.";
  }
  const name = collections.find((collection) => collection.id === domainId)?.name;
  if (!name) {
    return "Nothing left to recall in this collection. Pick another to keep reviewing.";
  }
  return `Nothing left to recall in ${name} right now. Pick another collection, or come back later.`;
}

export function ReviewPage({ seed, collections, domainId, narrationAccess }: ReviewPageProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [selectedCollectionId, setSelectedCollectionId] = useState(domainId);
  const [rememberOnDevice, setRememberOnDevice] = useState(true);
  const [ratings, setRatings] = useState<ReviewRating[]>([]);
  const [revealedTermIds, setRevealedTermIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const queue = useReviewQueue({ domainId: selectedCollectionId, seed });
  const { enqueueRating } = useReviewWriteQueue({ setErrorMessage });
  const selectedCollectionIdRef = useRef(selectedCollectionId);
  const advancedCardIdRef = useRef<string | null>(null);

  selectedCollectionIdRef.current = selectedCollectionId;

  const currentCard = queue.currentTerm;
  const currentRevealed = currentCard ? revealedTermIds.includes(currentCard.id) : false;
  const currentRating = currentCard
    ? ratings.find((rating) => rating.termId === currentCard.id)
    : undefined;

  const handleCollectionChange = useCallback(
    (nextDomainId: string) => {
      if (nextDomainId === selectedCollectionIdRef.current) return;
      setSelectedCollectionId(nextDomainId);
      selectedCollectionIdRef.current = nextDomainId;
      stripReviewDomainParam();
      queue.switchDomain(nextDomainId);
      if (rememberOnDevice) {
        saveReviewCollectionPreference(nextDomainId);
      }
    },
    [queue.switchDomain, rememberOnDevice],
  );

  const handleRememberChange = useCallback((remember: boolean) => {
    setRememberOnDevice(remember);
    if (remember) {
      saveReviewCollectionPreference(selectedCollectionIdRef.current);
    } else {
      clearReviewCollectionPreference();
    }
  }, []);

  const handleReveal = useCallback(() => {
    if (!currentCard || currentRevealed) return;
    setRevealedTermIds((ids) => [...ids, currentCard.id]);
    void recordReviewRevealAction(currentCard.id).then((result) => {
      if (result.error) setErrorMessage(result.error);
    });
  }, [currentCard, currentRevealed]);

  const handlePrevious = useCallback(() => {
    queue.goPrevious();
  }, [queue.goPrevious]);

  const handleNext = useCallback(() => {
    void queue.goNext();
  }, [queue.goNext]);

  const handleMarkedKnown = useCallback(() => {
    void queue.goNext();
  }, [queue.goNext]);

  const handleRate = useCallback(
    (grade: ReviewGrade) => {
      if (!currentCard || !currentRevealed) return;

      const alreadyRated = ratings.some((rating) => rating.termId === currentCard.id);
      if (!alreadyRated && advancedCardIdRef.current === currentCard.id) return;

      setRatings((prev) => upsertRating(prev, currentCard.id, grade));
      enqueueRating(currentCard.id, grade);

      if (alreadyRated) return;

      advancedCardIdRef.current = currentCard.id;
      void queue.goNext();
    },
    [currentCard, currentRevealed, ratings, enqueueRating, queue.goNext],
  );

  useReviewKeyboard({
    onReveal: handleReveal,
    onGrade: handleRate,
    onPrevious: handlePrevious,
    onNext: handleNext,
    revealed: currentRevealed,
    canRate: currentRevealed,
    enabled: currentCard !== null,
  });

  if (collections.length === 0) {
    return (
      <QuizPanel className="flex max-h-full min-h-0 w-full flex-col">
        <StudyNoActiveCollectionsState description="Turn on a collection on the collection page before you start reviewing." />
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

  if (queue.status === "error" && !currentCard) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 items-center">{collectionControl}</div>
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
        <div className="flex shrink-0 items-center">{collectionControl}</div>
        <QuizPanel>
          <div className="flex items-center gap-3 px-5 py-5 sm:px-6">
            <span className="loading loading-spinner loading-sm text-base-content/60" />
            <p className="m-0 text-sm text-base-content/60">Finding terms to review.</p>
          </div>
        </QuizPanel>
      </div>
    );
  }

  if (queue.status === "caughtUp" || !currentCard) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 items-center">{collectionControl}</div>
        <ReadCaughtUp
          description={caughtUpDescription(selectedCollectionId, collections)}
          actions={
            selectedCollectionId === "all" ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <LinkButton href="/jargon" variant="outline">
                  Collections
                </LinkButton>
                <LinkButton href="/jargon/import" variant="outline">
                  Import jargon
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
      canGoForward
      currentRevealed={currentRevealed}
      currentRating={currentRating}
      errorMessage={errorMessage ?? queue.errorMessage}
      reduceMotion={reduceMotion}
      narrationAccess={narrationAccess}
      collectionControl={collectionControl}
      onReveal={handleReveal}
      onPrevious={handlePrevious}
      onNext={handleNext}
      onMarkedKnown={handleMarkedKnown}
      onRate={handleRate}
    />
  );
}
