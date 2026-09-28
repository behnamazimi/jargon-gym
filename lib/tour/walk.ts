import { TOUR_CHAPTERS } from "./chapters";
import type { TourState } from "./state";
import type { TourTargetId } from "./targets";

/** The guided walk: finishing a page's last tip offers a button to the next
 *  page here. It only runs from Library onward, so tips that show up while
 *  someone is studying never pull them to another page. */
export const TOUR_WALK = [
  { route: "/jargon", label: "Library" },
  { route: "/jargon/read", label: "Read" },
  { route: "/jargon/review", label: "Review" },
  { route: "/jargon/quiz", label: "Quiz" },
] as const;

export type TourWalkStop = (typeof TOUR_WALK)[number];

/** The walk starts only in a Library that has collections: with none, Read,
 *  Review, and Quiz would just send the user back. */
export const TOUR_WALK_START_TARGET: TourTargetId = "library-collections";

function hasUnseenChapterOn(route: string, state: TourState) {
  return TOUR_CHAPTERS.some((chapter) => {
    if (state.seen.includes(chapter.id)) return false;
    const routes: readonly string[] =
      typeof chapter.route === "string" ? [chapter.route] : chapter.route;
    return routes.includes(route);
  });
}

/** The next page along the walk that still has tips of its own, if any. */
export function nextWalkStop(pathname: string, state: TourState): TourWalkStop | null {
  if (state.status === "done") return null;
  const index = TOUR_WALK.findIndex((stop) => stop.route === pathname);
  if (index === -1) return null;
  return TOUR_WALK.slice(index + 1).find((stop) => hasUnseenChapterOn(stop.route, state)) ?? null;
}
