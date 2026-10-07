import { TOUR_CHAPTERS, type TourChapter, type TourChapterId } from "./chapters";
import type { TourTargetId } from "./targets";

type TourStatus = "pending" | "done";

export type TourState = {
  status: TourStatus;
  seen: readonly TourChapterId[];
};

type IsTargetVisible = (target: TourTargetId) => boolean;

/** No settings row yet means the tour hasn't started. */
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
  const routes: readonly string[] =
    typeof chapter.route === "string" ? [chapter.route] : chapter.route;
  return routes.includes(pathname);
}

function unseenChaptersOn(pathname: string, state: TourState): TourChapter[] {
  if (state.status === "done") return [];
  const seen: readonly string[] = state.seen;
  return (TOUR_CHAPTERS as readonly TourChapter[]).filter(
    (chapter) =>
      runsOn(chapter, pathname) &&
      !seen.includes(chapter.id) &&
      (chapter.after ?? []).every((id) => seen.includes(id)),
  );
}

/** Every target this page's remaining chapters could point at, so the DOM
 *  is only watched while there is something left to show here. */
export function tourTargetsOn(pathname: string, state: TourState): TourTargetId[] {
  const targets = new Set<TourTargetId>();
  for (const chapter of unseenChaptersOn(pathname, state)) {
    for (const step of chapter.steps) {
      targets.add(step.target);
      if (step.advanceOnTarget) targets.add(step.advanceOnTarget);
    }
  }
  return [...targets];
}

/** The chapter to run on this page: the first unseen one for the route
 *  whose first target is on screen. */
export function pickChapter(
  pathname: string,
  state: TourState,
  isTargetVisible: IsTargetVisible,
  exclude?: string,
): TourChapter | null {
  return (
    unseenChaptersOn(pathname, state).find(
      (chapter) => chapter.id !== exclude && isTargetVisible(chapter.steps[0].target),
    ) ?? null
  );
}

export type TourProgress = { chapterId: TourChapterId; step: number };

type ResolvedTourStep = {
  chapterId: TourChapterId;
  chapter: TourChapter;
  stepIndex: number;
};

/** Moves past steps whose `advanceOnTarget` is already on screen. */
function advancedStep(chapter: TourChapter, step: number, isTargetVisible: IsTargetVisible) {
  let next = step;
  while (next < chapter.steps.length - 1) {
    const advanceOn = chapter.steps[next].advanceOnTarget;
    if (!advanceOn || !isTargetVisible(advanceOn)) break;
    next++;
  }
  return next;
}

/** The first step from `from` whose target is on screen, so a step whose
 *  target went away (a paused collection, a finished deck) doesn't stall
 *  the chapter. */
function firstVisibleStep(chapter: TourChapter, from: number, isTargetVisible: IsTargetVisible) {
  for (let index = from; index < chapter.steps.length; index++) {
    if (isTargetVisible(chapter.steps[index].target)) return index;
  }
  return null;
}

/** What to show now. A started chapter keeps going on any page it runs on,
 *  skipping steps whose target is gone. If none of its remaining targets
 *  are on screen, it steps aside so the page's other chapters can run. */
export function resolveTourStep(
  pathname: string,
  state: TourState,
  progress: TourProgress | null,
  isTargetVisible: IsTargetVisible,
): ResolvedTourStep | null {
  if (isTourDone(state)) return null;

  const resumed = progress
    ? unseenChaptersOn(pathname, state).find((chapter) => chapter.id === progress.chapterId)
    : undefined;
  if (resumed && progress) {
    const from = advancedStep(resumed, progress.step, isTargetVisible);
    const stepIndex = firstVisibleStep(resumed, from, isTargetVisible);
    if (stepIndex !== null) {
      return { chapterId: resumed.id as TourChapterId, chapter: resumed, stepIndex };
    }
  }

  const chapter = pickChapter(pathname, state, isTargetVisible, resumed?.id);
  if (!chapter) return null;
  return {
    chapterId: chapter.id as TourChapterId,
    chapter,
    stepIndex: advancedStep(chapter, 0, isTargetVisible),
  };
}

/** Library is where the tour starts, so its tips run back to back. Every
 *  other page shows one chapter per visit, so a link into Review or Read
 *  never turns into a long sequence. */
const CHAINED_ROUTE = "/app/library";

export function holdsChaptersForNextVisit(pathname: string, finishedOn: string | null): boolean {
  return finishedOn === pathname && pathname !== CHAINED_ROUTE;
}

export function isSameProgress(a: TourProgress | null, b: TourProgress): boolean {
  return a?.chapterId === b.chapterId && a.step === b.step;
}
