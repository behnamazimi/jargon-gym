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
  MASTERED_COOLDOWN,
  MIX_SLOTS,
  OVERALL_BAR_SCORE_THRESHOLDS,
  OVERALL_BLEND,
  OVERALL_BUCKETS,
  OVERALL_FAIL_RATE_PRIOR,
  OVERALL_READ_NUDGE,
  OVERALL_STALENESS,
  OVERALL_UNTESTED_READ,
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
