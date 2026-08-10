import type { Term } from "@/lib/jargon/types";
import type { PickReason } from "@/lib/smart-queue";
import type { TermPoolStatus } from "@/lib/study";

/** @deprecated Prefer TermPoolStatus from @/lib/study */
export type ReviewTermStatus = TermPoolStatus;

export type ReviewTerm = Term & {
  domainName: string;
  pickReasons?: PickReason[];
  /** Smart-queue score when this term was picked (debug). */
  pickScore?: number;
};

export type ReviewRating = {
  termId: string;
  known: boolean;
};

export type ReviewSetup = {
  domainIds: string[] | "all";
  status: ReviewTermStatus;
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
