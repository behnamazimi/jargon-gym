/** Trace queue — public API.
 *
 *  Layers: repository (RPC) → hydrate (TermCard) → service (fetch + rank +
 *  hydrate). Ranking math lives in lib/trace, not here — this module is
 *  just the DB/React seam around it. Outcome RPCs are internal — use
 *  lib/jargon/review-outcome. Human overview: docs/trace-smart-queue.md
 */

export type { ReviewEvent, PickContext, TraceCandidate } from "./types";

export {
  pickReadTerms,
  pickReadTermsForUser,
  pickReviewTerms,
  pickReviewTermsForUser,
  pickQuizTerms,
  pickQuizTermsForUser,
  listTraceCandidates,
  getPoolStats,
  getPoolStatsForUser,
  getPoolStatsByDomainForUser,
  fetchActiveTraceCandidatesForUser,
  fetchActiveTraceCandidates,
  fetchTermCardForUser,
  type ReviewScope,
  type PoolStats,
} from "./service";

export {
  recordTraceEvent,
  recordTraceEventForUser,
  fetchTraceState,
  fetchTraceStateForUser,
  bumpStreak,
  bumpStreakForUser,
  type TraceEventPayload,
} from "./repository";
