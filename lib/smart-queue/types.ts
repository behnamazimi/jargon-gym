/** Smart queue types — pure data structures, no runtime imports.
 */

/** unseen: never shown. seen/read: light exposure tiers (see ReviewShownOrigin).
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

/** Where a seen/read write came from — drives the abandoned_review reason. */
export type ReviewShownOrigin = "browse" | "read_cta" | "widget" | "review_reveal";

export type ReviewPreset = "balanced" | "learn_new" | "drill_weak";

/** Session context for pick weight overrides (does not change saved preset). */
export type PickContext = "default" | "quiz";

export type PickReason =
  | "unseen"
  | "new"
  | "learning"
  | "forgot"
  | "never_recalled"
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
  readCount: number;
  recalledCount: number;
  /** null until the term has ever been recalled; then one of learning/solid/verified/forgot. */
  lastRecalledOutcome: ReviewOutcome | null;
  lastRecalledAt: Date | null;
  lastShownOrigin: ReviewShownOrigin | null;
};

export type ScoreWeights = {
  unseenBoost: number;
  learningBoost: number;
  forgotBoost: number;
  newTermBoost: number;
  neverRecalledBoost: number;
  abandonedReviewBoost: number;
  solidCooldownPenalty: number;
  seenCountPenalty: number;
  /** Staleness rate once a term has been recalled at least once — the dominant rate. */
  recalledStalenessBoostPerHour: number;
  /** Staleness rate for terms whose last exposure was a deliberate Read (never recalled). */
  readStalenessBoostPerHour: number;
  /** Staleness rate for terms whose last exposure was incidental Seen (never recalled). */
  seenStalenessBoostPerHour: number;
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
