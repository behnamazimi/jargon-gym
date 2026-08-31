/** Smart queue — public API.
 *
 *  Layers: repository (RPC) → hydrate (TermCard) → service (compose).
 *  Selection is pure random — see pick.ts. Outcome RPCs are internal — use
 *  lib/jargon/review-outcome. Human overview: docs/smart-queue.md
 */

export type {
  ReviewEvent,
  PickContext,
  PickMeta,
  FailSource,
  PoolStats,
  ReviewCandidate,
} from "./types";

export { pickRandom } from "./pick";

export {
  pickReviewTerms,
  pickReviewTermsForUser,
  pickMixedReviewTerms,
  pickMixedReviewTermsForUser,
  listCandidates,
  listMixedReviewCandidates,
  pickQuizTermCards,
  pickQuizTermCardsForUser,
  getReviewPoolStats,
  getReviewPoolStatsForUser,
  getMixedReviewPoolStats,
  getMixedReviewPoolStatsForUser,
  getReviewPoolStatsByDomainForUser,
  fetchActiveReviewCandidatesForUser,
  fetchActiveReviewCandidates,
  fetchTermCardForUser,
  pickStaleKnownTermsForUser,
} from "./service";
export { computePoolStats } from "./stats";
export { isSameLocalDay, STUDY_TIMEZONE } from "./local-day";
