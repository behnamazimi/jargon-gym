"use client";

import { type StudyCollection } from "@/lib/study/types";
import { ReviewSummary } from "@/components/jargon/review/review-summary";
import { useReviewKeyboard } from "@/components/jargon/review/use-review-keyboard";
import { useReviewSession } from "@/components/jargon/review/use-review-session";
import { ReviewSetupStep } from "@/components/jargon/review/review-setup-step";
import { ReviewPlayingStep } from "@/components/jargon/review/review-playing-step";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { PoolStats } from "@/lib/trace-queue";

type ReviewPageProps = {
  collections: StudyCollection[];
  initialDomainId?: string;
  initialPoolStats?: PoolStats | null;
  narrationAccess: boolean;
};

export function ReviewPage({
  collections,
  initialDomainId,
  initialPoolStats,
  narrationAccess,
}: ReviewPageProps) {
  const reduceMotion = usePrefersReducedMotion();
  const session = useReviewSession(collections, initialDomainId, initialPoolStats);

  useReviewKeyboard({
    onReveal: session.handleReveal,
    onGrade: session.handleRate,
    onPrevious: session.handlePrevious,
    onNext: session.handleNext,
    revealed: session.currentRevealed,
    canRate: session.currentRevealed,
    enabled: session.step === "playing",
  });

  return (
    <>
      {session.step === "setup" ? (
        <ReviewSetupStep
          collections={collections}
          selectedCollectionId={session.selectedCollectionId}
          onSelectedCollectionIdChange={session.setSelectedCollectionId}
          cardCount={session.cardCount}
          cardCountInput={session.cardCountInput}
          cardCountError={session.cardCountError}
          onCardCountInputChange={session.handleCardCountInputChange}
          onApplyCardCount={session.applyCardCount}
          poolStats={session.poolStats}
          savedSession={session.savedSession}
          onResumeSession={session.handleResumeSession}
          onDiscardSession={session.handleDiscardSession}
          errorMessage={session.errorMessage}
          isStarting={session.isStarting}
          onStartReview={session.handleStartReview}
        />
      ) : null}

      {session.step === "playing" && session.currentCard ? (
        <ReviewPlayingStep
          currentCard={session.currentCard}
          currentIndex={session.currentIndex}
          totalCards={session.cards.length}
          currentRevealed={session.currentRevealed}
          currentRating={session.currentRating}
          errorMessage={session.errorMessage}
          reduceMotion={reduceMotion}
          narrationAccess={narrationAccess}
          onReveal={session.handleReveal}
          onPrevious={session.handlePrevious}
          onNext={session.handleNext}
          onMarkedKnown={session.handleMarkedKnown}
          onRate={session.handleRate}
          onDone={session.handleDone}
        />
      ) : null}

      {session.step === "summary" ? (
        <ReviewSummary
          reviewedCount={session.ratings.length}
          retainedCount={session.retainedCount}
          forgotCount={session.forgotCount}
          onReviewAgain={session.resetToSetup}
        />
      ) : null}
    </>
  );
}
