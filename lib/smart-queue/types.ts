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
 *  concept of its own — it ranks by read exposure + same-day fail cooldown —
 *  while Review and Quiz each read their own independent streak/count/
 *  timestamp fields. */
export type PickContext = "read" | "review" | "quiz";

export type FailSource = "review" | "quiz";

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
  /** When this term was marked known — null for unknown-pool candidates. Drives Quiz tier-1 ordering. */
  knownAt: Date | null;
};

export type PoolStats = {
  /** Never engaged in this context (readCount === 0 for "read", own test count === 0 for "review"/"quiz"). */
  unseen: number;
  seen: number;
  total: number;
  allSeenOnce: boolean;
};

export type PickMeta = {
  termId: string;
  /** Which pool this term was drawn from — only set for Review's mixed pick,
   *  since that's the only context where a session blends both pools. */
  originStatus?: "known" | "unknown";
};
