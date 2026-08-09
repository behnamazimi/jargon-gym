/** Smart queue types — pure data structures, no runtime imports.
 */

/** The six writes recordRead/recordReveal/recordTest can make. */
export type ReviewEvent =
  | "read"
  | "reveal"
  | "review_pass"
  | "review_fail"
  | "quiz_pass"
  | "quiz_fail";

/** Which activity's history a pick is scored against. Read has no pass/fail
 *  concept of its own — it just ranks by read exposure + cross-activity fail
 *  propagation — while Review and Quiz each read their own independent
 *  streak/count/timestamp fields. */
export type PickContext = "read" | "review" | "quiz";

export type FailSource = "review" | "quiz";

export type PickReason =
  | "unseen"
  | "new"
  | "struggling"
  | "repeat_fail"
  | "engaged_untested"
  | "abandoned_review"
  | "stale"
  | "mastered_cooldown"
  | "cross_fail"
  | "recently_engaged"
  | "steady";

export type ReviewCandidate = {
  termId: string;
  domainId: string;
  createdAt: Date;
  /** Read tier: Read page/command, /read, jargon card open. */
  readCount: number;
  lastReadAt: Date | null;
  /** Review's own test history — independent of quiz. */
  reviewRecallCount: number;
  lastReviewRecallAt: Date | null;
  /** Signed: positive = consecutive passes, negative = consecutive fails, 0 = never tested. */
  reviewStreak: number;
  /** Quiz's own test history — independent of review. */
  quizTestCount: number;
  lastQuizTestedAt: Date | null;
  quizStreak: number;
  /** Review-only: revealed, not yet rated. */
  pendingReveal: boolean;
  /** Most recent fail from either activity, for cross-activity propagation. */
  lastFailAt: Date | null;
  lastFailSource: FailSource | null;
};

export type ScoreWeights = {
  unseenBoost: number;
  /** Per point of |streak| when struggling (streak < 0), capped at FAIL_STREAK_CAP. */
  strugglingBoostPerStreak: number;
  masteredCooldownPenalty: number;
  /** Read count >= ENGAGED_MIN_COUNT but this context's own test count is 0. */
  engagedButUntestedBoost: number;
  abandonedReviewBoost: number;
  newTermBoost: number;
  stalenessBoostPerHour: number;
  stalenessCapHours: number;
  /** Boosts Read priority when either activity most recently failed. */
  crossFailReadBoost: number;
  /** Boosts a test context's priority when the OTHER test activity most recently failed. */
  crossFailOtherTestBoost: number;
};

export type PoolStats = {
  /** Never engaged in this context (readCount === 0 for "read", own test count === 0 for "review"/"quiz"). */
  unseen: number;
  seen: number;
  stale: number;
  total: number;
  allSeenOnce: boolean;
};

export type ScoredCandidate = ReviewCandidate & {
  score: number;
  reasons: PickReason[];
};

export type PickMeta = {
  termId: string;
  score: number;
  reasons: PickReason[];
};
