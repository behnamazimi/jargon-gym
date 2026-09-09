"use client";

import { type StudyCollection } from "@/lib/study/types";
import { ReviewSummary } from "@/components/jargon/review/review-summary";
import { useReviewKeyboard } from "@/components/jargon/review/use-review-keyboard";
import { useReviewSession } from "@/components/jargon/review/use-review-session";
import { ReviewSetupStep } from "@/components/jargon/review/review-setup-step";
import { ReviewPlayingStep } from "@/components/jargon/review/review-playing-step";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type ReviewPageProps = {
  collections: StudyCollection[];
  initialDomainId?: string;
  narrationAccess: boolean;
};

export function ReviewPage({ collections, initialDomainId, narrationAccess }: ReviewPageProps) {
  const reduceMotion = usePrefersReducedMotion();
  const session = useReviewSession(collections, initialDomainId);

  useReviewKeyboard({
    onReveal: session.handleReveal,
    onGrade: (grade) => void session.handleRate(grade),
    onPrevious: session.handlePrevious,
    onNext: session.handleNext,
    revealed: session.currentRevealed,
    canRate: session.currentRevealed && !session.isRating,
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
          isRating={session.isRating}
          errorMessage={session.errorMessage}
          reduceMotion={reduceMotion}
          narrationAccess={narrationAccess}
          onReveal={session.handleReveal}
          onPrevious={session.handlePrevious}
          onNext={session.handleNext}
          onMarkedKnown={session.handleMarkedKnown}
          onRate={(grade) => void session.handleRate(grade)}
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
