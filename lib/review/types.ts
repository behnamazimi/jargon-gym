import type { CollectionLanguage } from "@/lib/terms/languages";
import type { ReviewRecallState } from "@/lib/terms/term-card";
import type { Term } from "@/lib/terms/types";
import type { ReviewGrade } from "@/lib/trace";

export type ReviewTerm = Term & {
  collectionId: string;
  collectionName: string;
  collectionLanguage: CollectionLanguage;
  isNewToUser?: boolean;
  recall?: ReviewRecallState;
  /** 0 or missing for the first showing in a session; 1.. for a missed term asked again. */
  visit?: number;
};

export type ReviewRating = {
  /** `cardKey` of the card, so each showing of a term has its own rating. */
  key: string;
  grade: ReviewGrade;
};

export type PendingReviewWrite = {
  id: string;
  termId: string;
  grade: ReviewGrade;
  /** Which showing of the term this grade is for; 1.. means a retry. */
  visit?: number;
};

export type ReviewQueueSeed = {
  error?: string;
  caughtUp?: boolean;
  terms: ReviewTerm[];
};
