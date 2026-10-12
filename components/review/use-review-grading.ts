import { useCallback, useRef, useState, type RefObject } from "react";
import { recordReviewRevealAction } from "@/app/(private)/app/actions";
import { track } from "@/lib/analytics/track";
import { canMoveForward } from "@/lib/review/keyboard";
import { cardKey, makeRetryCard, shouldRetry } from "@/lib/review/retry";
import type { ReviewRating, ReviewTerm } from "@/lib/review/types";
import { upsertRating } from "@/lib/review/writes";
import type { TermNarrationHandle } from "@/components/terms/term-narration-player";
import type { ReviewGrade } from "@/lib/trace";

type GradingQueue = {
  currentTerm: ReviewTerm | null;
  goNext: () => Promise<number>;
  scheduleRetry: (retry: ReviewTerm) => void;
};

type UseReviewGradingArgs = {
  queue: GradingQueue;
  enqueueRating: (termId: string, grade: ReviewGrade, visit?: number) => unknown;
  setErrorMessage: (message: string | null) => void;
  narrateOnReveal: boolean;
  narrationAccess: boolean;
  narrationRef: RefObject<TermNarrationHandle | null>;
};

/** What has been revealed and rated in this session, per showing of a card
 *  (a missed term can be asked again, so state is keyed by `cardKey`). */
export function useReviewGrading({
  queue,
  enqueueRating,
  setErrorMessage,
  narrateOnReveal,
  narrationAccess,
  narrationRef,
}: UseReviewGradingArgs) {
  const [ratings, setRatings] = useState<ReviewRating[]>([]);
  const [revealedKeys, setRevealedKeys] = useState<string[]>([]);
  const advancedCardKeyRef = useRef<string | null>(null);
  // State updates land after the event, so two reveal triggers in one
  // event would both see the card as hidden and record the reveal twice.
  const revealRecordedRef = useRef(new Set<string>());

  const currentCard = queue.currentTerm;
  const currentKey = currentCard ? cardKey(currentCard) : null;
  const currentRevealed = currentKey ? revealedKeys.includes(currentKey) : false;
  const currentRating = currentKey
    ? ratings.find((rating) => rating.key === currentKey)
    : undefined;

  const handleReveal = useCallback(() => {
    if (!currentCard || revealRecordedRef.current.has(cardKey(currentCard))) return;
    revealRecordedRef.current.add(cardKey(currentCard));
    setRevealedKeys((keys) => [...keys, cardKey(currentCard)]);
    // Only a clip that already exists plays; this never asks for one to be made.
    if (narrateOnReveal && narrationAccess && typeof currentCard.narrationVersion === "string") {
      narrationRef.current?.play();
    }
    // Asking a missed term again isn't new exposure, so only the first showing is recorded.
    if ((currentCard.visit ?? 0) > 0) return;
    void recordReviewRevealAction(currentCard.id).then((result) => {
      if (result.error) setErrorMessage(result.error);
    });
  }, [currentCard, narrateOnReveal, narrationAccess, narrationRef, setErrorMessage]);

  const handleNext = useCallback(() => {
    if (!canMoveForward({ revealed: currentRevealed, rated: currentRating !== undefined })) return;
    void queue.goNext();
  }, [currentRevealed, currentRating, queue]);

  const handleRate = useCallback(
    (grade: ReviewGrade) => {
      if (!currentCard || !currentRevealed) return;

      const key = cardKey(currentCard);
      const alreadyRated = ratings.some((rating) => rating.key === key);
      if (!alreadyRated && advancedCardKeyRef.current === key) return;

      const visit = currentCard.visit ?? 0;
      setRatings((prev) => upsertRating(prev, key, grade));
      track("review_term_rated", { grade, retry: visit > 0 });
      enqueueRating(currentCard.id, grade, visit);

      if (alreadyRated) return;

      advancedCardKeyRef.current = key;
      if (shouldRetry(currentCard, grade)) {
        queue.scheduleRetry(makeRetryCard(currentCard, grade, new Date()));
      }
      void queue.goNext();
    },
    [currentCard, currentRevealed, ratings, enqueueRating, queue],
  );

  return { currentRevealed, currentRating, handleReveal, handleNext, handleRate };
}
