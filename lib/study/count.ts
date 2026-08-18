import type { StudyCollection, TermPoolStatus } from "./types";
import { MAX_STUDY_TERMS } from "./types";

export function countTermsForSelection(
  collections: StudyCollection[],
  domainIds: string[] | "all",
  status: TermPoolStatus,
): number {
  const selected =
    domainIds === "all"
      ? collections
      : collections.filter((collection) => domainIds.includes(collection.id));

  return selected.reduce(
    (total, collection) =>
      total + (status === "known" ? collection.knownCount : collection.unknownCount),
    0,
  );
}

/** Review's pool is always blended now, so its "terms available" count is
 *  the combined known + unknown total per collection, not one status's slice. */
export function countTermsForMixedSelection(
  collections: StudyCollection[],
  domainIds: string[] | "all",
): number {
  const selected =
    domainIds === "all"
      ? collections
      : collections.filter((collection) => domainIds.includes(collection.id));

  return selected.reduce(
    (total, collection) => total + collection.knownCount + collection.unknownCount,
    0,
  );
}

export function getMaxStudyCount(availableTermCount: number): number {
  if (availableTermCount <= 0) return 0;
  return Math.min(availableTermCount, MAX_STUDY_TERMS);
}
