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

export type ReviewSetup = {
  domainIds: string[] | "all";
  cardCount: number;
};

export type PendingReviewWrite = {
  id: string;
  termId: string;
  grade: ReviewGrade;
};

export type ReviewSessionState = {
  setup: ReviewSetup;
  cards: ReviewTerm[];
  currentIndex: number;
  ratings: ReviewRating[];
  revealedTermIds: string[];
  startedAt: string;
  /** Grades applied locally but not yet confirmed persisted by the write
   *  queue — replayed on resume so a crash/reload can't silently drop one. */
  pendingWrites: PendingReviewWrite[];
};
