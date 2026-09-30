import { LIBRARY_CHAPTERS } from "./library";
import { MORE_CHAPTERS } from "./more";
import { STUDY_CHAPTERS } from "./study";

export type { TourChapter, TourPlacement } from "./types";

/** Order matters: chapters on the same route run one after another, in
 *  this order, skipping any whose first target isn't on screen. */
export const TOUR_CHAPTERS = [...LIBRARY_CHAPTERS, ...STUDY_CHAPTERS, ...MORE_CHAPTERS];

export type TourChapterId = (typeof TOUR_CHAPTERS)[number]["id"];

export function isTourChapterId(value: string): value is TourChapterId {
  return TOUR_CHAPTERS.some((chapter) => chapter.id === value);
}
