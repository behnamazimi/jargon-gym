import type { StudyCollection } from "./types";
import { MAX_STUDY_TERMS } from "./types";

/** Every tier now ranks the same single term set, so "terms available" for
 *  a selection is just the collection's total term count. */
export function countTermsForSelection(
  collections: StudyCollection[],
  domainIds: string[] | "all",
): number {
  const selected =
    domainIds === "all"
      ? collections
      : collections.filter((collection) => domainIds.includes(collection.id));

  return selected.reduce((total, collection) => total + collection.termCount, 0);
}

export function getMaxStudyCount(availableTermCount: number): number {
  if (availableTermCount <= 0) return 0;
  return Math.min(availableTermCount, MAX_STUDY_TERMS);
}
