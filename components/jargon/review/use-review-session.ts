import { type StudyCollection } from "@/lib/study/types";
import { useReviewSetup } from "@/components/jargon/review/use-review-setup";
import { useReviewPlaying } from "@/components/jargon/review/use-review-playing";

export function useReviewSession(collections: StudyCollection[], initialDomainId?: string) {
  const setup = useReviewSetup(collections, initialDomainId);
  const playing = useReviewPlaying({
    step: setup.step,
    setStep: setup.setStep,
    currentSetup: setup.currentSetup,
    setSelectedCollectionId: setup.setSelectedCollectionId,
    setCardCount: setup.setCardCount,
    setErrorMessage: setup.setErrorMessage,
    refreshPoolStats: setup.refreshPoolStats,
  });

  return {
    step: setup.step,
    selectedCollectionId: setup.selectedCollectionId,
    setSelectedCollectionId: setup.setSelectedCollectionId,
    cardCount: setup.cardCount,
    cardCountInput: setup.cardCountInput,
    cardCountError: setup.cardCountError,
    handleCardCountInputChange: setup.handleCardCountInputChange,
    applyCardCount: setup.applyCardCount,
    errorMessage: setup.errorMessage,
    poolStats: setup.poolStats,
    domainIds: setup.domainIds,
    availableTermCount: setup.availableTermCount,
    maxCardCount: setup.maxCardCount,

    cards: playing.cards,
    currentIndex: playing.currentIndex,
    ratings: playing.ratings,
    isStarting: playing.isStarting,
    isRating: playing.isRating,
    savedSession: playing.savedSession,
    currentCard: playing.currentCard,
    currentRevealed: playing.currentRevealed,
    currentRating: playing.currentRating,
    resetToSetup: playing.resetToSetup,
    handleResumeSession: playing.handleResumeSession,
    handleDiscardSession: playing.handleDiscardSession,
    handleStartReview: playing.handleStartReview,
    handleReveal: playing.handleReveal,
    handlePrevious: playing.handlePrevious,
    handleNext: playing.handleNext,
    handleMarkedKnown: playing.handleMarkedKnown,
    handleRate: playing.handleRate,
    handleDone: playing.handleDone,
    retainedCount: playing.retainedCount,
    forgotCount: playing.forgotCount,
  };
}
