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

export function getMaxStudyCount(availableTermCount: number): number {
  if (availableTermCount <= 0) return 0;
  return Math.min(availableTermCount, MAX_STUDY_TERMS);
}
