/** Smart queue types — pure data structures, no runtime imports.
 */

/** unseen: never shown. seen/read: light exposure tiers.
 *  learning/solid/verified/forgot: "recalled" — an actual tested judgment.
 */
export type ReviewOutcome =
  | "unseen"
  | "seen"
  | "read"
  | "learning"
  | "solid"
  | "verified"
  | "forgot";

export type ReviewPreset = "balanced" | "learn_new" | "drill_weak";

/** Session context for pick weight overrides (does not change saved preset). */
export type PickContext = "default" | "quiz";

export type PickReason =
  | "unseen"
  | "new"
  | "learning"
  | "forgot"
  | "repeat_fail"
  | "never_recalled"
  | "browse_only"
  | "abandoned_review"
  | "stale"
  | "solid_cooldown"
  | "steady";

export type ReviewCandidate = {
  termId: string;
  domainId: string;
  createdAt: Date;
  seenCount: number;
  lastSeenAt: Date | null;
  lastOutcome: ReviewOutcome;
  /** Deliberate Read-tier exposure: Read CTA (web + Telegram) or widget "Next". */
  readCount: number;
  /** Review-reveal exposure — disjoint from readCount, its own counter. */
  reviewRevealCount: number;
  recalledCount: number;
  /** null until the term has ever been recalled; then one of learning/solid/verified/forgot. */
  lastRecalledOutcome: ReviewOutcome | null;
  lastRecalledAt: Date | null;
  /** Timestamp of the last review-reveal write, independent of what happened since. */
  lastReviewRevealAt: Date | null;
  /** Consecutive learning/forgot outcomes since the last solid/verified. */
  failStreak: number;
};

export type ScoreWeights = {
  unseenBoost: number;
  learningBoost: number;
  forgotBoost: number;
  newTermBoost: number;
  neverRecalledBoost: number;
  /** Smaller variant of neverRecalledBoost for terms with zero deliberate Read exposure. */
  browseOnlyBoost: number;
  abandonedReviewBoost: number;
  /** Extra boost per consecutive fail, capped at FAIL_STREAK_CAP. */
  failStreakBoostPerRepeat: number;
  solidCooldownPenalty: number;
  seenCountPenalty: number;
  /** Staleness only ever applies once a term has been recalled at least once. */
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
  reasons: PickReason[];
};

export type PickMeta = {
  termId: string;
  score: number;
  reasons: PickReason[];
};
