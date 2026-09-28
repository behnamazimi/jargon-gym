"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TourChapterId } from "@/lib/tour/chapters";
import { resolveTourStep, withChapterSeen, type TourState } from "@/lib/tour/state";
import type { TourTargetId } from "@/lib/tour/targets";
import {
  TOUR_WALK,
  TOUR_WALK_START_TARGET,
  nextWalkStop,
  type TourWalkStop,
} from "@/lib/tour/walk";

type ShowingStep = { chapterId: TourChapterId; stepIndex: number; stepCount: number };

/** Keeps the collection the user picked when moving to the next page. */
function carriedQuery() {
  const domain = new URLSearchParams(window.location.search).get("domain");
  return domain ? `?domain=${encodeURIComponent(domain)}` : "";
}

/** The guided walk from Library through Read, Review, and Quiz. Returns the
 *  page the current tip's button should lead to (only on the last tip left
 *  on this page), and how to go there. */
export function useTourWalk(
  pathname: string,
  state: TourState,
  visible: ReadonlySet<TourTargetId>,
  showing: ShowingStep | null,
): { nextStop: TourWalkStop | null; goTo: (stop: TourWalkStop) => void } {
  const router = useRouter();
  const [walking, setWalking] = useState(false);

  const onWalk = TOUR_WALK.some((stop) => stop.route === pathname);
  if (!walking && pathname === TOUR_WALK[0].route && visible.has(TOUR_WALK_START_TARGET)) {
    setWalking(true);
  }
  if (walking && !onWalk) setWalking(false);

  let nextStop: TourWalkStop | null = null;
  if (walking && showing && showing.stepIndex === showing.stepCount - 1) {
    const after = withChapterSeen(state, showing.chapterId);
    const lastOnPage = !resolveTourStep(pathname, after, null, (target) => visible.has(target));
    if (lastOnPage) nextStop = nextWalkStop(pathname, after);
  }

  return {
    nextStop,
    goTo: (stop) => router.push(`${stop.route}${carriedQuery()}`),
  };
}
