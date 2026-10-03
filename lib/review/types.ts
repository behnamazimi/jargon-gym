import type { DomainLanguage } from "@/lib/terms/languages";
import type { Term } from "@/lib/terms/types";
import type { ReviewGrade } from "@/lib/trace";

export type ReviewTerm = Term & {
  domainName: string;
  domainLanguage: DomainLanguage;
  isNewToUser?: boolean;
};

export type ReviewRating = {
  termId: string;
  grade: ReviewGrade;
};

export type PendingReviewWrite = {
  id: string;
  termId: string;
  grade: ReviewGrade;
};

export type ReviewQueueSeed = {
  error?: string;
  caughtUp?: boolean;
  terms: ReviewTerm[];
};
