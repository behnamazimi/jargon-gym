import { TOUR_CHAPTERS } from "./chapters";
import type { TourState } from "./state";
import type { TourTargetId } from "./targets";

/** The guided walk: once Library's tips are done, the tour points at the next
 *  page's link and the user clicks it themselves. It only runs from Library
 *  onward, so tips that show up while someone is studying never pull them to
 *  another page. */
export type TourWalkStop = {
  route: string;
  label: string;
  target: TourTargetId;
  blurb: string;
};

export const TOUR_WALK: readonly TourWalkStop[] = [
  {
    route: "/app/library",
    label: "Library",
    target: "nav-library",
    blurb: "Every collection you've added and all its terms.",
  },
  {
    route: "/app/read",
    label: "Read",
    target: "nav-read",
    blurb:
      "Read terms and their definitions. It's input, not a test: every term you read builds familiarity and gives it a head start in Review.",
  },
  {
    route: "/app/review",
    label: "Review",
    target: "nav-review",
    blurb:
      "See a term, recall its meaning from memory, then rate how well you did. New terms come first, then the ones you're closest to forgetting.",
  },
  {
    route: "/app/quiz",
    label: "Quiz",
    target: "nav-quiz",
    blurb:
      "Check what you know with a quick quiz. There are two ways to take one: Simple, or smarter questions written by AI.",
  },
];

function hasUnseenChapterOn(route: string, state: TourState) {
  return TOUR_CHAPTERS.some((chapter) => {
    if (state.seen.includes(chapter.id)) return false;
    const routes: readonly string[] = [chapter.route].flat();
    return routes.includes(route);
  });
}

/** The next page along the walk that still has tips of its own, if any. The
 *  walk is on once Library's collections tip is seen; that's saved, so it
 *  survives a reload. */
export function nextWalkStop(pathname: string, state: TourState): TourWalkStop | null {
  if (state.status === "done" || !state.seen.includes("library")) return null;
  const index = TOUR_WALK.findIndex((stop) => stop.route === pathname);
  if (index === -1) return null;
  return TOUR_WALK.slice(index + 1).find((stop) => hasUnseenChapterOn(stop.route, state)) ?? null;
}
