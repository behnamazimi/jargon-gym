import type { Term } from "@/lib/jargon/types";
import type { ReviewGrade } from "@/lib/trace";

export type ReviewTerm = Term & {
  domainName: string;
};

export type ReviewRating = {
  termId: string;
  grade: ReviewGrade;
};

export type ReviewSetup = {
  domainIds: string[] | "all";
  cardCount: number;
};

export type ReviewSessionState = {
  setup: ReviewSetup;
  cards: ReviewTerm[];
  currentIndex: number;
  ratings: ReviewRating[];
  revealedTermIds: string[];
  startedAt: string;
};
