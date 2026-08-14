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

export { formatPickReason, formatPickDebugLine } from "./reasons";
export {
  BASE_COOLDOWN_HOURS,
  ENGAGED_MIN_COUNT,
  FAIL_RATE_MIN_ATTEMPTS,
  MIX_ALREADY_TOUCHED_SLOTS,
  MIX_NEVER_ENGAGED_SLOTS,
  QUEUE_TIMEZONE,
} from "./weights";
export type { Strength } from "./strength";
export { computeStrength, strengthForCandidate } from "./strength";

export {
  pickReviewTerms,
  pickReviewTermsForUser,
  listScoredCandidates,
  getReviewPoolStats,
  getReviewPoolStatsForUser,
  getReviewPoolStatsByDomainForUser,
  fetchActiveReviewCandidatesForUser,
  fetchTermCardForUser,
} from "./service";
export { computePoolStats } from "./stats";
