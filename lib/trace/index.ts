/** TRACE — public API.
 *
 *  Layers: constants → decay/local-day (shared helpers) → familiarity/
 *  recall/recognition (one trace each) → mastery/queue (compose across
 *  traces) → snapshot.ts (compose across layers into the shapes callers
 *  actually want) → this barrel. Nothing outside lib/trace should reach
 *  past this file. queue.ts imports from mastery.ts directly (Read's ranking
 *  reuses the two-weeks-ahead mastery) — both are the same "compose across
 *  traces" layer, just not the same file.
 *  @see docs/trace-formula.md
 */

export * from "./constants";
export type {
  KnownLabel,
  QuestionType,
  ReviewGrade,
  TraceCandidate,
  TraceSnapshot,
  TraceState,
} from "./types";
export {
  rankReadQueue,
  rankReviewQueue,
  rankQuizQueue,
  computeReadExposure,
  computeReadTempering,
  recallRetrievabilityNow,
  recognitionRetrievabilityNow,
  quizRankScore,
  cooldownEndsAt,
} from "./queue";
export { posteriorToStability } from "./recognition";
export { daysBetween } from "./decay";
export {
  deriveKnownLabel,
  crossedThresholds,
  confidence,
  blendMastery,
  masteryAdjusted,
} from "./mastery";
export {
  hasTraceActivity,
  partitionMasteryBuckets,
  computeCrossingPace,
  estimateMilestone,
} from "./pace";
export type { MasteryBucketCounts, PaceRate, MilestoneEstimate } from "./pace";
export { DEFAULT_FORECAST_RATES, FORECAST_SHORT_DAYS, forecastMastery } from "./forecast";
export type { ForecastRates, MasteryForecast } from "./forecast";
export { STUDY_TIMEZONE, isSameLocalDay, studyTimezone } from "./local-day";
export {
  computeTraceSnapshot,
  applyReadEvent,
  applyReviewGrade,
  daysUntilNextReview,
  applyQuizAnswer,
  aggregateMastery,
} from "./snapshot";
