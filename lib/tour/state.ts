import { TOUR_CHAPTERS, type TourChapter, type TourChapterId } from "./chapters";
import type { TourTargetId } from "./targets";

type TourStatus = "pending" | "done";

export type TourState = {
  status: TourStatus;
  seen: readonly TourChapterId[];
};

/** A missing settings row means a new account (existing ones were backfilled). */
export const NEW_USER_TOUR_STATE: TourState = { status: "pending", seen: [] };

export function isTourDone(state: TourState): boolean {
  return (
    state.status === "done" || TOUR_CHAPTERS.every((chapter) => state.seen.includes(chapter.id))
  );
}

export function withChapterSeen(state: TourState, chapterId: TourChapterId): TourState {
  const seen = state.seen.includes(chapterId) ? state.seen : [...state.seen, chapterId];
  const next = { ...state, seen };
  return isTourDone(next) ? { ...next, status: "done" } : next;
}

export function withTourSkipped(state: TourState): TourState {
  return { ...state, status: "done" };
}

function runsOn(chapter: TourChapter, pathname: string) {
  return typeof chapter.route === "string"
    ? chapter.route === pathname
    : chapter.route.includes(pathname);
}

/** The chapter to run on this page: the first unseen one for the route
 *  whose first target is on screen. */
export function pickChapter(
  pathname: string,
  state: TourState,
  isTargetVisible: (target: TourTargetId) => boolean,
): TourChapter | null {
  if (state.status === "done") return null;
  return (
    TOUR_CHAPTERS.find(
      (chapter) =>
        runsOn(chapter, pathname) &&
        !state.seen.includes(chapter.id) &&
        isTargetVisible(chapter.steps[0].target),
    ) ?? null
  );
}

export type TourProgress = { chapterId: TourChapterId; pathname: string; step: number };

export type ResolvedTourStep = {
  chapterId: TourChapterId;
  chapter: TourChapter;
  stepIndex: number;
};

/** Moves past steps whose `advanceOnTarget` is already on screen. */
function advancedStep(
  chapter: TourChapter,
  step: number,
  isTargetVisible: (target: TourTargetId) => boolean,
) {
  let next = step;
  while (next < chapter.steps.length - 1) {
    const advanceOn = chapter.steps[next].advanceOnTarget;
    if (!advanceOn || !isTargetVisible(advanceOn)) break;
    next++;
  }
  return next;
}

/** What to show now. A chapter already started on this page keeps going
 *  even after its first target leaves the screen (the Review card after a
 *  flip); otherwise a new chapter is picked. */
export function resolveTourStep(
  pathname: string,
  state: TourState,
  progress: TourProgress | null,
  isTargetVisible: (target: TourTargetId) => boolean,
): ResolvedTourStep | null {
  if (isTourDone(state)) return null;
  const resumed =
    progress?.pathname === pathname
      ? TOUR_CHAPTERS.find((chapter) => chapter.id === progress.chapterId)
      : undefined;
  const chapter = resumed ?? pickChapter(pathname, state, isTargetVisible);
  if (!chapter) return null;
  const startStep = resumed && progress ? progress.step : 0;
  return {
    chapterId: chapter.id as TourChapterId,
    chapter,
    stepIndex: advancedStep(chapter, startStep, isTargetVisible),
  };
}

export function isSameProgress(a: TourProgress | null, b: TourProgress): boolean {
  return a?.chapterId === b.chapterId && a.pathname === b.pathname && a.step === b.step;
}
