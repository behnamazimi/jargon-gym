"use client";

import { useState } from "react";
import { holdsChaptersForNextVisit, type TourState } from "@/lib/tour/state";
import { nextWalkStop, type TourWalkStop } from "@/lib/tour/walk";
import { useTourTarget } from "./use-tour-dom";

/** What happened on the page the user is on right now. Both facts clear once
 *  they're on another page, so tips come back on the next visit. */
export function useTourVisit(pathname: string) {
  const [finishedOn, setFinishedOn] = useState<string | null>(null);
  const [hiddenOn, setHiddenOn] = useState<string | null>(null);
  if (finishedOn && finishedOn !== pathname) setFinishedOn(null);
  if (hiddenOn && hiddenOn !== pathname) setHiddenOn(null);

  const hidden = hiddenOn === pathname;
  return {
    /** No tips at all: hidden for now, or this page's one chapter is done. */
    quiet: hidden || holdsChaptersForNextVisit(pathname, finishedOn),
    finished: finishedOn === pathname,
    hidden,
    markFinished: () => setFinishedOn(pathname),
    hide: () => setHiddenOn(pathname),
  };
}

/** After a page's last tip, the next page's link to point at, so the user
 *  clicks through themselves. */
export function useTourNudge(
  pathname: string,
  state: TourState,
  active: boolean,
): { stop: TourWalkStop; target: HTMLElement } | null {
  const stop = active ? nextWalkStop(pathname, state) : null;
  const target = useTourTarget(stop?.target ?? null);
  return stop && target ? { stop, target } : null;
}
