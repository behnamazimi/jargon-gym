/** Smart queue types — pure data structures, no runtime imports.
 */

export type ReviewOutcome =
  | "unseen"
  | "shown"
  | "learning"
  | "solid"
  | "skipped"
  | "verified"
  | "forgot";

export type ReviewPreset = "balanced" | "learn_new" | "drill_weak";

export type ReviewCandidate = {
  termId: string;
  domainId: string;
  createdAt: Date;
  seenCount: number;
  lastSeenAt: Date | null;
  lastOutcome: ReviewOutcome;
};

export type ScoreWeights = {
  unseenBoost: number;
  learningBoost: number;
  forgotBoost: number;
  newTermBoost: number;
  seenCountPenalty: number;
  stalenessBoostPerHour: number;
  stalenessCapHours: number;
};

export type PoolStats = {
  unseen: number;
  /** Terms with seen_count > 0 (includes fresh + stale). */
  seen: number;
  stale: number;
  total: number;
  /** True when every term in the scoped pool has been seen at least once. */
  allSeenOnce: boolean;
};

export type ScoredCandidate = ReviewCandidate & {
  score: number;
};
