/** Smart queue types — pure data structures, no runtime imports.
 */

import type { Strength } from "./strength";

/** The six writes recordRead/recordReveal/recordTest can make. */
export type ReviewEvent =
  | "read"
  | "reveal"
  | "review_pass"
  | "review_fail"
  | "quiz_pass"
  | "quiz_fail";

/** Which activity's history a pick is scored against. Read has no pass/fail
 *  concept of its own — it ranks by read exposure + same-day fail cooldown —
 *  while Review and Quiz each read their own independent streak/count/
 *  timestamp fields. */
export type PickContext = "read" | "review" | "quiz";

export type FailSource = "review" | "quiz";

export type PickReason =
  | "unseen"
  | "struggling"
  | "repeat_fail"
  | "engaged_untested"
  | "abandoned_review"
  | "stale"
  | "mastered_cooldown"
  | "recent_read_cooldown"
  | "recent_fail_cooldown"
  | "cross_fail"
  | "fragile"
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
  /** Lifetime fail counts per activity, independent of current streak — drives fragile. */
  reviewFailCount: number;
  quizFailCount: number;
};

export type ScoreWeights = {
  unseenBoost: number;
  /** Per point of |streak| when struggling (streak < 0), capped at FAIL_STREAK_CAP. */
  strugglingBoostPerStreak: number;
  masteredCooldownPenalty: number;
  /** Same-day sit-outs: Read→Review/Quiz via last_read_at; fail→Read via last_fail_at;
   *  own-activity fail via that context's own streak/last-activity. */
  sameDayCooldownPenalty: number;
  /** Read count >= ENGAGED_MIN_COUNT but this context's own test count is 0. */
  engagedButUntestedBoost: number;
  abandonedReviewBoost: number;
  /** Ceiling of the decay-shaped staleness curve (reached asymptotically at the cap). */
  stalenessMaxBoost: number;
  stalenessCapHours: number;
  /** Per point of |source activity's streak| when the OTHER test context is boosted, capped at FAIL_STREAK_CAP. */
  crossFailOtherTestBoostPerRepeat: number;
  /** Boost at 100% lifetime fail rate; scales linearly down to 0. */
  fragileBoostMax: number;
};

export type PoolStats = {
  /** Never engaged in this context (readCount === 0 for "read", own test count === 0 for "review"/"quiz"). */
  unseen: number;
  seen: number;
  stale: number;
  /** seen - stale: engaged and not yet stale. */
  recent: number;
  /** Own-context streak < 0. Always 0 for "read", which has no streak. */
  struggling: number;
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
  /** Display-only mastery tier for this candidate's own-context history. Never affects score. */
  strength?: Strength;
};
