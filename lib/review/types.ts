import type { Term } from "@/lib/jargon/types";
import type { ReviewGrade } from "@/lib/trace";

export type ReviewTerm = Term & {
  domainName: string;
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
