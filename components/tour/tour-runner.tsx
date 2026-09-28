"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { markTourChapterSeenAction, skipTourAction } from "@/app/(private)/actions";
import { useMediaQuery } from "@/hooks/use-platform";
import { PLATFORM_MEDIA } from "@/lib/platform";
import {
  isSameProgress,
  resolveTourStep,
  withChapterSeen,
  withTourSkipped,
  type TourProgress,
  type TourState,
} from "@/lib/tour/state";
import { TourStepCard } from "./tour-step-card";
import { useBlockingDialogOpen, useTourTarget, useVisibleTourTargets } from "./use-tour-dom";

export function TourRunner({ initialState }: { initialState: TourState }) {
  const pathname = usePathname();
  const [state, setState] = useState(initialState);
  const [progress, setProgress] = useState<TourProgress | null>(null);
  const visible = useVisibleTourTargets();
  const dialogOpen = useBlockingDialogOpen();
  const isTouch = useMediaQuery(PLATFORM_MEDIA.coarsePointer);

  const resolved = resolveTourStep(pathname, state, progress, (target) => visible.has(target));
  const step = resolved ? resolved.chapter.steps[resolved.stepIndex] : null;
  const target = useTourTarget(step?.target ?? null);

  // Remember where we are, so the chapter survives its first target leaving
  // the screen and an auto-advanced step doesn't slip back.
  if (resolved) {
    const current = { chapterId: resolved.chapterId, pathname, step: resolved.stepIndex };
    if (!isSameProgress(progress, current)) setProgress(current);
  }

  if (!resolved || !step || !target || dialogOpen) return null;

  const { chapterId, chapter, stepIndex } = resolved;
  const isLast = stepIndex === chapter.steps.length - 1;

  function handleNext() {
    if (!isLast) {
      setProgress({ chapterId, pathname, step: stepIndex + 1 });
      return;
    }
    setState((current) => withChapterSeen(current, chapterId));
    setProgress(null);
    void markTourChapterSeenAction(chapterId);
  }

  function handleSkip() {
    setState(withTourSkipped);
    setProgress(null);
    void skipTourAction();
  }

  return (
    <TourStepCard
      key={`${chapterId}-${stepIndex}`}
      targetId={step.target}
      target={target}
      title={step.title}
      body={(isTouch && step.bodyTouch) || step.body}
      placement={step.placement ?? "bottom"}
      stepNumber={stepIndex + 1}
      stepCount={chapter.steps.length}
      onNext={handleNext}
      onSkip={handleSkip}
    />
  );
}
