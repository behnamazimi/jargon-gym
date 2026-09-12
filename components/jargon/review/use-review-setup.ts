import { useEffect, useMemo, useRef, useState } from "react";
import { countTermsForSelection, getMaxStudyCount } from "@/lib/study/count";
import { type StudyCollection } from "@/lib/study/types";
import type { PoolStats } from "@/lib/trace-queue";
import { getReviewPoolStatsAction } from "@/app/(private)/jargon/review/actions";
import type { ReviewSetup } from "@/lib/review/types";

export type ReviewStep = "setup" | "playing" | "summary";

const DEFAULT_CARD_COUNT = 10;

export function useReviewSetup(
  collections: StudyCollection[],
  initialDomainId?: string,
  initialPoolStats: PoolStats | null = null,
) {
  const [step, setStep] = useState<ReviewStep>("setup");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    initialDomainId ?? "all",
  );
  const [cardCount, setCardCount] = useState(DEFAULT_CARD_COUNT);
  const [cardCountInput, setCardCountInput] = useState(String(DEFAULT_CARD_COUNT));
  const [cardCountError, setCardCountError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(initialPoolStats);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  // The server already computed poolStats for the resolved initial domain
  // (getReviewSetupData) — skip this effect's very first run so the setup
  // screen doesn't flash empty then refill on first paint. Later changes to
  // domainIds/statsRefreshKey (the user picked a different collection, or
  // finished a session) still refetch normally.
  const isFirstPoolStatsRun = useRef(true);

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

    if (isFirstPoolStatsRun.current) {
      isFirstPoolStatsRun.current = false;
      return;
    }

    let cancelled = false;
    setPoolStats(null);

    void getReviewPoolStatsAction(domainIds).then((result) => {
      if (cancelled) return;
      if ("poolStats" in result && result.poolStats) {
        setPoolStats(result.poolStats);
        return;
      }
      if ("error" in result) {
        setErrorMessage(result.error);
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

  return {
    step,
    setStep,
    selectedCollectionId,
    setSelectedCollectionId,
    cardCount,
    setCardCount,
    cardCountInput,
    cardCountError,
    handleCardCountInputChange,
    applyCardCount,
    errorMessage,
    setErrorMessage,
    poolStats,
    refreshPoolStats: () => setStatsRefreshKey((key) => key + 1),
    domainIds,
    availableTermCount,
    maxCardCount,
    currentSetup,
  };
}
