/** TRACE — public API.
 *
 *  Layers: constants → decay/local-day (shared helpers) → familiarity/
 *  recall/recognition (one trace each) → mastery/queue (compose across
 *  traces) → snapshot.ts (compose across layers into the shapes callers
 *  actually want) → this barrel. Nothing outside lib/trace should reach
 *  past this file. mastery.ts and queue.ts may import from each other
 *  directly (queue's Read ranking reuses mastery's blend) — both are the
 *  same "compose across traces" layer, just not the same file.
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
} from "./queue";
export { daysBetween } from "./decay";
export { deriveKnownLabel, confidence, blendMastery, masteryAdjusted } from "./mastery";
export { partitionMasteryBuckets, computeCrossingPace, estimateMilestone } from "./pace";
export type { MasteryBucketCounts, PaceRate, MilestoneEstimate } from "./pace";
export { STUDY_TIMEZONE, isSameLocalDay } from "./local-day";
export {
  summarizeCalibration,
  computeAttentionFlag,
  findAbandonedReveals,
  summarizeGradeDistribution,
  summarizeRetrievabilityDistribution,
  summarizeActivityTimeline,
  computeCrossTrackFlag,
  CALIBRATION_MIN_BUCKET_SAMPLE,
  ABANDONMENT_WINDOW_MINUTES,
  ATTENTION_MIN_RECENT_EVENTS,
  ATTENTION_DIVERGENCE_THRESHOLD,
  CROSS_TRACK_DIVERGENCE_THRESHOLD,
} from "./calibration";
export type {
  TraceEventName,
  CalibrationBucket,
  CalibrationSummary,
  AttentionFlag,
  AbandonedReveal,
  RetrievabilityBucket,
  CrossTrackFlag,
  ActivityDay,
} from "./calibration";
export {
  computeTraceSnapshot,
  applyReadEvent,
  applyReviewGrade,
  applyQuizAnswer,
  aggregateMastery,
  daysUntilCooldownClears,
} from "./snapshot";
