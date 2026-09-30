"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { markTourChapterSeenAction, skipTourAction } from "@/app/(private)/actions";
import { useMediaQuery } from "@/hooks/use-platform";
import { PLATFORM_MEDIA } from "@/lib/platform";
import {
  CHAINED_ROUTE,
  isSameProgress,
  resolveTourStep,
  tourTargetsOn,
  withChapterSeen,
  withTourSkipped,
  type TourProgress,
  type TourState,
} from "@/lib/tour/state";
import type { TourWalkStop } from "@/lib/tour/walk";
import { TourStepCard } from "./tour-step-card";
import { useTargetBox, useTourTarget, useVisibleTourTargets } from "./use-tour-dom";
import { useTourNudge, useTourVisit } from "./use-tour-visit";

const targetIds = new WeakMap<HTMLElement, number>();
let nextTargetId = 0;

/** A stable number per element, so a card remounts when the page swaps its
 *  target for a new node (e.g. the next Review card). */
function targetKey(target: HTMLElement) {
  let id = targetIds.get(target);
  if (id === undefined) {
    id = nextTargetId++;
    targetIds.set(target, id);
  }
  return id;
}

/** Keep keyboard focus in the tour when Next was pressed from the keyboard,
 *  without stealing it from anything else on the page. */
function shouldFocusCard(keyboardFlow: boolean) {
  const active = document.activeElement;
  return (
    keyboardFlow && (!active || active === document.body || !!active.closest("[data-tour-card]"))
  );
}

type Resolved = NonNullable<ReturnType<typeof resolveTourStep>>;
type Step = Resolved["chapter"]["steps"][number];

function stepBody(step: Step, isTouch: boolean) {
  return (isTouch && step.bodyTouch) || step.body;
}

/** What screen readers hear when a tip appears; the card never takes focus
 *  away from the page, so this is how they learn it's there. */
function announcement(
  shown: (Resolved & { step: Step }) | null,
  nudge: { stop: TourWalkStop } | null,
  isTouch: boolean,
) {
  if (nudge) {
    return `Next: ${nudge.stop.label}. ${nudge.stop.blurb} Press the highlighted link to open it.`;
  }
  if (!shown) return "";
  const { stepIndex, chapter, step } = shown;
  return `Tip ${stepIndex + 1} of ${chapter.steps.length}: ${step.title}. ${stepBody(step, isTouch)} Press Escape to hide tips for now.`;
}

/** The pointer to the next page's link, shown after a page's last tip. */
function NudgeCard({
  nudge,
  dim,
  onDismiss,
  onSkip,
}: {
  nudge: { stop: TourWalkStop; target: HTMLElement };
  dim: boolean;
  onDismiss: () => void;
  onSkip: () => void;
}) {
  const { box, scrolling } = useTargetBox(nudge.target);
  return (
    <TourStepCard
      key={nudge.stop.route}
      target={nudge.target}
      box={box}
      scrolling={scrolling}
      title={`Next: ${nudge.stop.label}`}
      body={nudge.stop.blurb}
      stepNumber={1}
      stepCount={1}
      focusPrimary={false}
      dim={dim}
      nudge
      onNext={() => {}}
      onDismiss={onDismiss}
      onSkip={onSkip}
    />
  );
}

export function TourRunner({ initialState }: { initialState: TourState }) {
  const pathname = usePathname();
  const [state, setState] = useState(initialState);
  const [progress, setProgress] = useState<TourProgress | null>(null);
  const [keyboardFlow, setKeyboardFlow] = useState(false);
  const visit = useTourVisit(pathname);
  const watched = tourTargetsOn(pathname, state);
  const visible = useVisibleTourTargets(watched);
  // Same split the UI uses for its gestures (swipe rows, tap to reveal):
  // phone-width screens or touch pointers get the touch wording.
  const isTouch = useMediaQuery(`${PLATFORM_MEDIA.phone}, ${PLATFORM_MEDIA.coarsePointer}`);

  // While a sheet, menu, or focus mode covers the page, only targets inside
  // it count as visible, so the page's own step holds until it closes.
  const resolved = visit.quiet
    ? null
    : resolveTourStep(pathname, state, progress, (target) => visible.has(target));
  const step = resolved ? resolved.chapter.steps[resolved.stepIndex] : null;
  const target = useTourTarget(step?.target ?? null);
  const { box, scrolling } = useTargetBox(target);

  // Remember where we are, so the chapter survives its first target leaving
  // the screen and an auto-advanced step doesn't slip back.
  if (resolved) {
    const current = { chapterId: resolved.chapterId, step: resolved.stepIndex };
    if (!isSameProgress(progress, current)) setProgress(current);
  }

  const showing = resolved && step && target ? { ...resolved, step, target } : null;
  // After a page's last tip, point at the next page's link; the user clicks it.
  const nudge = useTourNudge(pathname, state, !showing && !visit.hidden && visit.finished);
  const dim = pathname === CHAINED_ROUTE;

  function finishChapter() {
    if (!showing) return;
    const { chapterId } = showing;
    setState((current) => withChapterSeen(current, chapterId));
    setProgress(null);
    visit.markFinished();
    void markTourChapterSeenAction(chapterId);
  }

  function handleNext(viaKeyboard: boolean) {
    if (!showing) return;
    setKeyboardFlow(viaKeyboard);
    if (showing.stepIndex === showing.chapter.steps.length - 1) {
      finishChapter();
      return;
    }
    setProgress({ chapterId: showing.chapterId, step: showing.stepIndex + 1 });
  }

  function hideTips() {
    visit.hide();
    setProgress(null);
  }

  function handleSkip() {
    setState(withTourSkipped);
    setProgress(null);
    void skipTourAction();
  }

  return (
    <>
      <div className="sr-only" aria-live="polite">
        {announcement(showing, nudge, isTouch)}
      </div>
      {showing ? (
        <TourStepCard
          key={`${showing.chapterId}-${showing.stepIndex}-${targetKey(showing.target)}`}
          target={showing.target}
          box={box}
          scrolling={scrolling}
          title={showing.step.title}
          body={stepBody(showing.step, isTouch)}
          placement={showing.step.placement}
          stepNumber={showing.stepIndex + 1}
          stepCount={showing.chapter.steps.length}
          focusPrimary={shouldFocusCard(keyboardFlow)}
          dim={dim}
          onNext={handleNext}
          onDismiss={hideTips}
          onSkip={handleSkip}
        />
      ) : nudge ? (
        <NudgeCard nudge={nudge} dim={dim} onDismiss={hideTips} onSkip={handleSkip} />
      ) : null}
    </>
  );
}
