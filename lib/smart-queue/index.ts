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
export { RANKING, STRENGTH } from "./weights";
export type { OverallStrength, OverallStrengthResult } from "./strength";
export { strengthForCandidate, computeOverallStrength } from "./strength";

export {
  pickReviewTerms,
  pickReviewTermsForUser,
  pickMixedReviewTerms,
  pickMixedReviewTermsForUser,
  listScoredCandidates,
  listScoredMixedReviewCandidates,
  listScoredMixedReviewCandidatesForUser,
  pickQuizTermCards,
  pickQuizTermCardsForUser,
  listScoredQuizCandidates,
  listScoredQuizCandidatesForUser,
  getReviewPoolStats,
  getReviewPoolStatsForUser,
  getMixedReviewPoolStats,
  getMixedReviewPoolStatsForUser,
  getReviewPoolStatsByDomainForUser,
  fetchActiveReviewCandidatesForUser,
  fetchActiveReviewCandidates,
  fetchTermCardForUser,
} from "./service";
export { computePoolStats } from "./stats";
export { isSameLocalDay } from "./local-day";
