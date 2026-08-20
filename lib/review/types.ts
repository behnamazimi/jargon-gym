import type { Term } from "@/lib/jargon/types";
import type { OverallStrength, PickReason } from "@/lib/smart-queue";
import type { TermPoolStatus } from "@/lib/study";

export type ReviewTerm = Term & {
  domainName: string;
  pickReasons?: PickReason[];
  /** Smart-queue score when this term was picked (debug). */
  pickScore?: number;
  /** Display-only mastery tier for this term in Review. Never affects scoring. */
  strength?: OverallStrength;
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
