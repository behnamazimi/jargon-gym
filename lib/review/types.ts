import type { Term } from "@/lib/jargon/types";
import type { TermPoolStatus } from "@/lib/study";

export type ReviewTerm = Term & {
  domainName: string;
  /** Which pool this card was drawn from — drives the known/unknown flip
   *  direction when rated, since a mixed session blends both pools. */
  originStatus: TermPoolStatus;
};

export type ReviewRating = {
  termId: string;
  known: boolean;
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
