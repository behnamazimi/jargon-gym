/** Smart queue algorithm — public API.
 *
 *  Layers: repository (RPC) → hydrate (TermCard) → service (compose).
 *  Outcome RPCs are internal — use lib/jargon/review-outcome.
 *  Human overview: docs/smart-queue.md
 */

export type {
  ReviewEvent,
  PickContext,
  PickReason,
  PickMeta,
  FailSource,
  PoolStats,
  ReviewCandidate,
} from "./types";

export { formatPickReason, formatPickDebugLine, formatQuizTier } from "./reasons";
export type { QuizTier } from "./pick";
export { quizTierOf } from "./pick";
export {
  ENGAGED_MIN_READ_COUNT,
  FAIL_RATE_MIN_ATTEMPTS,
  MASTERED_COOLDOWN_BASE_HOURS,
  MIX_ALREADY_TOUCHED_SLOTS,
  MIX_NEVER_ENGAGED_SLOTS,
  OVERALL_BAR_SCORE_THRESHOLDS,
  OVERALL_BUCKET_MEDIUM_MIN_SCORE,
  OVERALL_BUCKET_STRONG_MIN_SCORE,
  OVERALL_FAIL_RATE_PRIOR_RATE,
  OVERALL_FAIL_RATE_PRIOR_STRENGTH,
  OVERALL_READ_NUDGE_MAX,
  OVERALL_READ_NUDGE_PER_READ,
  OVERALL_STALENESS_FLOOR_BASE,
  OVERALL_STALENESS_FLOOR_CAP,
  OVERALL_STALENESS_TAU_BASE_HOURS,
  OVERALL_STALENESS_TAU_CAP_HOURS,
  OVERALL_STREAK_MAX_CREDIT,
  OVERALL_STREAK_WEIGHT,
  OVERALL_WEIGHTS,
  QUEUE_TIMEZONE,
} from "./weights";
export type { OverallStrength, OverallStrengthResult } from "./strength";
export { strengthForCandidate, computeOverallStrength } from "./strength";

export {
  pickReviewTerms,
  pickReviewTermsForUser,
  listScoredCandidates,
  pickQuizTermCards,
  pickQuizTermCardsForUser,
  listScoredQuizCandidates,
  listScoredQuizCandidatesForUser,
  getReviewPoolStats,
  getReviewPoolStatsForUser,
  getReviewPoolStatsByDomainForUser,
  fetchActiveReviewCandidatesForUser,
  fetchActiveReviewCandidates,
  fetchTermCardForUser,
} from "./service";
export { computePoolStats } from "./stats";
export { isSameLocalDay } from "./local-day";
