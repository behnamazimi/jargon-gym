/** TRACE — public API.
 *
 *  Layers: constants → decay/local-day (shared helpers) → familiarity/
 *  recall/recognition (one trace each) → mastery/queue (compose across
 *  traces) → this barrel (compose across layers into the shapes callers
 *  actually want: a full-state snapshot, or a single event applied to
 *  full state). Nothing outside lib/trace should reach past this file.
 *  mastery.ts and queue.ts may import from each other directly (queue's
 *  Read ranking reuses mastery's blend) — both are the same "compose
 *  across traces" layer, just not the same file.
 *  @see docs/trace-formula.md
 */

import { RETRIEVABILITY_DECAY_SCALE, SESSION_COOLDOWN_RETRIEVABILITY } from "./constants";
import { daysBetween } from "./decay";
import { familiarityUsed, computeFamiliarity } from "./familiarity";
import {
  aggregateMastery as aggregatePerTermMastery,
  blendMastery,
  masteryAdjusted,
  deriveKnownLabel,
} from "./mastery";
import {
  applyReviewGrade as applyRecallGrade,
  retrievability as recallRetrievability,
} from "./recall";
import {
  posteriorToStability,
  retrievability as recognitionRetrievability,
  updatePosterior,
} from "./recognition";
import type { QuestionType, ReviewGrade, TraceCandidate, TraceSnapshot, TraceState } from "./types";

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

/** Full live snapshot of one term's trace state — familiarity, both
 *  retrievabilities, and the blended mastery/label. */
export function computeTraceSnapshot(state: TraceState, now: Date): TraceSnapshot {
  const familiarity = computeFamiliarity(state.readCount, state.lastReadAt, now);
  const recallR =
    state.recallStability !== null
      ? recallRetrievability(
          state.recallStability,
          daysBetween(state.lastReviewRecallAt ?? now, now),
        )
      : null;
  const recognitionR =
    state.quizKnowledgePosterior !== null
      ? recognitionRetrievability(
          posteriorToStability(state.quizKnowledgePosterior),
          daysBetween(state.lastQuizTestedAt ?? now, now),
        )
      : null;

  const familiarityUsedValue = familiarityUsed(familiarity);
  const mastery = blendMastery({
    familiarityUsed: familiarityUsedValue,
    recallRetrievability: recallR,
    recognitionRetrievability: recognitionR,
  });
  const testCount = state.reviewRecallCount + state.quizTestCount;
  const adjustedMastery = masteryAdjusted(mastery, testCount);

  return {
    familiarity,
    familiarityUsed: familiarityUsedValue,
    recallRetrievability: recallR,
    recognitionRetrievability: recognitionR,
    mastery,
    masteryAdjusted: adjustedMastery,
    knownLabel: deriveKnownLabel(adjustedMastery, testCount),
  };
}

/** Read event: exposure only, no scoring math beyond the count/timestamp bump. */
export function applyReadEvent(
  state: Pick<TraceState, "readCount">,
  now: Date,
): { readCount: number; lastReadAt: Date } {
  return { readCount: state.readCount + 1, lastReadAt: now };
}

/** Review grade: familiarity (from the Read state already in hand) feeds
 *  the cold-start nudge on a term's first-ever grade; every later grade
 *  ignores familiarity and updates purely from the prior S_r/D_r. */
export function applyReviewGrade(
  state: Pick<
    TraceState,
    "readCount" | "lastReadAt" | "recallStability" | "recallDifficulty" | "lastReviewRecallAt"
  >,
  grade: ReviewGrade,
  now: Date,
): { recallStability: number; recallDifficulty: number } {
  const familiarity = computeFamiliarity(state.readCount, state.lastReadAt, now);
  const current =
    state.recallStability !== null && state.recallDifficulty !== null
      ? { stability: state.recallStability, difficulty: state.recallDifficulty }
      : null;

  const next = applyRecallGrade(current, grade, familiarity, now, state.lastReviewRecallAt);
  return { recallStability: next.stability, recallDifficulty: next.difficulty };
}

/** Quiz answer: posterior update, softened on failure by current recall
 *  strength (null recallStability — no Review history yet — applies the
 *  full, unsoftened penalty). */
export function applyQuizAnswer(
  state: Pick<TraceState, "quizKnowledgePosterior" | "recallStability" | "lastReviewRecallAt">,
  correct: boolean,
  questionType: QuestionType,
  now: Date,
): { quizKnowledgePosterior: number } {
  const recallR =
    state.recallStability !== null
      ? recallRetrievability(
          state.recallStability,
          daysBetween(state.lastReviewRecallAt ?? now, now),
        )
      : null;

  const posterior = updatePosterior(state.quizKnowledgePosterior, correct, questionType, recallR);
  return { quizKnowledgePosterior: posterior };
}

/** §8 OverallMastery across a set of candidates already scoped to N_active
 *  (≥1 Read) — computes each term's Mastery_adjusted then averages. */
export function aggregateMastery(candidates: TraceCandidate[], now: Date): number {
  const values = candidates.map((c) => computeTraceSnapshot(c, now).masteryAdjusted);
  return aggregatePerTermMastery(values);
}

/** How many more days until a term's retrievability in one track decays
 *  back under the §6 session cooldown threshold — inverts the same R(t) =
 *  (1 + t/(9S))⁻¹ curve rankReviewQueue/rankQuizQueue use to exclude a
 *  just-graded term from the ranked queue, so callers (the debug page) can
 *  show why — and for how long — a term is missing from it. Mirrors those
 *  functions' own recall/recognition `r` derivation exactly, so there's one
 *  formula for "in cooldown" rather than a second one that could drift.
 *  Null when the track has no state yet (untested terms are never cooled
 *  down — queue.ts's UNTESTED_RETRIEVABILITY sentinel is always ≤
 *  threshold) or the term is already eligible (at/under threshold). */
export function daysUntilCooldownClears(
  candidate: Pick<
    TraceCandidate,
    "recallStability" | "lastReviewRecallAt" | "quizKnowledgePosterior" | "lastQuizTestedAt"
  >,
  track: "recall" | "recognition",
  now: Date,
): number | null {
  const stability =
    track === "recall"
      ? candidate.recallStability
      : candidate.quizKnowledgePosterior !== null
        ? posteriorToStability(candidate.quizKnowledgePosterior)
        : null;
  if (stability === null) return null;

  const lastAt = track === "recall" ? candidate.lastReviewRecallAt : candidate.lastQuizTestedAt;
  const elapsedDays = daysBetween(lastAt ?? now, now);
  const r =
    track === "recall"
      ? recallRetrievability(stability, elapsedDays)
      : recognitionRetrievability(stability, elapsedDays);
  if (r <= SESSION_COOLDOWN_RETRIEVABILITY) return null;

  const targetElapsedDays =
    RETRIEVABILITY_DECAY_SCALE * stability * (1 / SESSION_COOLDOWN_RETRIEVABILITY - 1);
  return Math.max(0, targetElapsedDays - elapsedDays);
}
