/** Smart queue algorithm — public API.
 *
 *  Layers: repository (RPC) → hydrate (TermCard) → service (compose).
 *  Outcome RPCs are internal — use lib/jargon/review-outcome.
 *  Human overview: docs/smart-queue.md
 */

export type { ReviewOutcome, ReviewPreset, PickContext, PickReason, PickMeta } from "./types";

export { formatPickReason } from "./reasons";
export { SOLID_COOLDOWN_HOURS, SHOWN_WITHOUT_SOLID_MIN_SEEN } from "./presets";

export {
  pickReviewTerms,
  pickReviewTermsForUser,
  getReviewPoolStats,
  getReviewPoolStatsForUser,
  getReviewPoolStatsByDomainForUser,
  fetchTermCardForUser,
} from "./service";
