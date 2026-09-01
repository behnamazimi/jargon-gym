/** TRACE types — pure data structures, no runtime imports.
 *  @see docs/trace-formula.md
 */

import { AGAIN, EASY, GOOD, HARD } from "./constants";

/** Review grade — recall-before-reveal, FSRS-5 grading (§4). */
export type ReviewGrade = typeof AGAIN | typeof HARD | typeof GOOD | typeof EASY;

export type QuestionType = "multiple_choice" | "true_false";

export type KnownLabel = "known" | "learning" | "unknown";

/** Persisted per-term state (maps 1:1 onto review_state's TRACE columns).
 *  Nullable fields are null until the first event of that kind — that
 *  nullability *is* the per-tier eligibility rule (§4b/§5/§10). */
export type TraceState = {
  readCount: number;
  lastReadAt: Date | null;

  recallStability: number | null;
  recallDifficulty: number | null;
  reviewRecallCount: number;
  lastReviewRecallAt: Date | null;

  quizKnowledgePosterior: number | null;
  quizTestCount: number;
  lastQuizTestedAt: Date | null;
};

/** One term's live-computed snapshot at a point in time. */
export type TraceSnapshot = {
  familiarity: number;
  familiarityUsed: number;
  recallRetrievability: number | null;
  recognitionRetrievability: number | null;
  mastery: number;
  masteryAdjusted: number;
  knownLabel: KnownLabel;
};

/** A term's TraceState plus the identity/bookkeeping fields queue ranking
 *  and aggregate mastery need (termId for output, createdAt as Read's
 *  tie-break, everMasteredAt for the §8 "terms learned" high-water mark —
 *  not part of the live decay math, just carried alongside it). This is
 *  the shape the get_trace_candidates RPC row maps onto — lib/trace-queue
 *  re-exports it rather than redefining it. */
export type TraceCandidate = TraceState & {
  termId: string;
  domainId: string;
  createdAt: Date;
  everMasteredAt: Date | null;
};
