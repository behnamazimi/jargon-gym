import { useMemo, useRef, useState } from "react";
import { countTermsForSelection, getMaxStudyCount } from "@/lib/study/count";
import { type StudyCollection } from "@/lib/study/types";
import { getReviewPoolStatsAction } from "@/app/(private)/jargon/review/actions";
import type { ReviewSetup } from "@/lib/review/types";
import type { PoolStats } from "@/lib/trace-queue";
import { useMountEffect } from "@/hooks/use-mount-effect";

export type ReviewStep = "setup" | "playing" | "summary";

const DEFAULT_CARD_COUNT = 10;

function clampCardCount(current: number, availableTermCount: number): number {
  if (availableTermCount === 0) return current;
  const next = Math.min(Math.max(DEFAULT_CARD_COUNT, 1), getMaxStudyCount(availableTermCount));
  return Math.min(current, next) || next;
}

function initialCardCount(collections: StudyCollection[], initialDomainId?: string): number {
  const domainIds = initialDomainId && initialDomainId !== "all" ? [initialDomainId] : "all";
  return clampCardCount(DEFAULT_CARD_COUNT, countTermsForSelection(collections, domainIds));
}

export function useReviewSetup(
  collections: StudyCollection[],
  initialDomainId?: string,
  initialPoolStats?: PoolStats | null,
) {
  const [step, setStep] = useState<ReviewStep>("setup");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    initialDomainId ?? "all",
  );
  const startingCardCount = initialCardCount(collections, initialDomainId);
  const [cardCount, setCardCount] = useState(startingCardCount);
  const [cardCountInput, setCardCountInput] = useState(String(startingCardCount));
  const [cardCountError, setCardCountError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(initialPoolStats ?? null);
  const poolStatsRequestIdRef = useRef(0);

  const domainIds = useMemo(
    (): string[] | "all" => (selectedCollectionId === "all" ? "all" : [selectedCollectionId]),
    [selectedCollectionId],
  );

  const availableTermCount = useMemo(
    () => countTermsForSelection(collections, domainIds),
    [collections, domainIds],
  );

  const maxCardCount = getMaxStudyCount(availableTermCount);

  const selectionKey = `${selectedCollectionId}:${availableTermCount}`;
  const [prevSelectionKey, setPrevSelectionKey] = useState(selectionKey);
  if (selectionKey !== prevSelectionKey) {
    setPrevSelectionKey(selectionKey);
    if (availableTermCount > 0) {
      const newCount = clampCardCount(cardCount, availableTermCount);
      setCardCount(newCount);
      setCardCountInput(String(newCount));
      setCardCountError(null);
    }
  }

  function fetchPoolStats(ids: string[] | "all") {
    const requestId = ++poolStatsRequestIdRef.current;
    setPoolStats(null);
    void getReviewPoolStatsAction(ids).then((result) => {
      if (requestId !== poolStatsRequestIdRef.current) return;
      if ("poolStats" in result && result.poolStats) {
        setPoolStats(result.poolStats);
        return;
      }
      if ("error" in result) {
        setErrorMessage(result.error);
      }
    });
  }

  useMountEffect(() => {
    if (initialPoolStats != null || collections.length === 0) return;
    fetchPoolStats(initialDomainId && initialDomainId !== "all" ? [initialDomainId] : "all");
  });

  const currentSetup = useMemo(
    (): ReviewSetup => ({
      domainIds,
      cardCount,
    }),
    [domainIds, cardCount],
  );

  function applyCardCount(value: number) {
    setCardCount(value);
    setCardCountInput(String(value));
    setCardCountError(null);
  }

  function handleCardCountInputChange(value: string) {
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
  }

  function handleSelectedCollectionIdChange(id: string) {
    setSelectedCollectionId(id);
    fetchPoolStats(id === "all" ? "all" : [id]);
  }

  function refreshPoolStats() {
    fetchPoolStats(domainIds);
  }

  return {
    step,
    setStep,
    selectedCollectionId,
    setSelectedCollectionId,
    handleSelectedCollectionIdChange,
    cardCount,
    setCardCount,
    cardCountInput,
    cardCountError,
    handleCardCountInputChange,
    applyCardCount,
    errorMessage,
    setErrorMessage,
    poolStats,
    refreshPoolStats,
    domainIds,
    availableTermCount,
    maxCardCount,
    currentSetup,
  };
}
