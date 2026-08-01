/** Smart queue algorithm — public API.
 *
 *  Layers: repository (RPC) → hydrate (TermCard) → service (compose).
 *  Outcome RPCs are internal — use lib/jargon/review-outcome.
 *  Human overview: docs/smart-queue.md
 */

export type { ReviewOutcome, ReviewPreset } from "./types";

export {
  pickReviewTerms,
  pickReviewTermsForUser,
  getReviewPoolStats,
  getReviewPoolStatsForUser,
  getReviewPoolStatsByDomainForUser,
  fetchTermCardForUser,
} from "./service";
