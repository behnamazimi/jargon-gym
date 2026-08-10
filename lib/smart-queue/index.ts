/** Smart queue algorithm — public API.
 *
 *  Layers: repository (RPC) → hydrate (TermCard) → service (compose).
 *  Outcome RPCs are internal — use lib/jargon/review-outcome.
 *  Human overview: docs/smart-queue.md
 */

export type { ReviewEvent, PickContext, PickReason, PickMeta, FailSource } from "./types";

export { formatPickReason, formatPickDebugLine } from "./reasons";
export { SOLID_COOLDOWN_HOURS, ENGAGED_MIN_COUNT, QUEUE_TIMEZONE } from "./weights";

export {
  pickReviewTerms,
  pickReviewTermsForUser,
  listScoredCandidates,
  getReviewPoolStats,
  getReviewPoolStatsForUser,
  getReviewPoolStatsByDomainForUser,
  fetchTermCardForUser,
} from "./service";
