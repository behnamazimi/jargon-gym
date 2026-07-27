import type { Term } from "@/lib/jargon/types";

export type ReviewTermStatus = "known" | "unknown";

export type ReviewTerm = Term & {
  domainName: string;
};

export type ReviewRating = {
  termId: string;
  known: boolean;
};

export type ReviewSetup = {
  domainIds: string[] | "all";
  status: ReviewTermStatus;
  cardCount: number;
  shuffle: boolean;
};

export type ReviewSessionState = {
  setup: ReviewSetup;
  cards: ReviewTerm[];
  currentIndex: number;
  ratings: ReviewRating[];
  revealedTermIds: string[];
  startedAt: string;
};
