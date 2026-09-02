/** Calibration — diagnostic math over `review_events` rows, for the debug
 *  page's Calibration view. This is analysis *of* TRACE's output, not part
 *  of the live scoring path: nothing here should ever be imported by
 *  review-outcome.ts or the ranking functions in queue.ts. It answers
 *  questions review_state's live-only design can't — does predicted
 *  retrievability track actual outcomes, and how often does a Review
 *  reveal go ungraded — using the append-only log added in
 *  supabase/migrations/20260901140000_review_events_log.sql.
 *  @see docs/trace.md
 */

/** Below this many samples, a bucket/flag renders "not enough data" rather
 *  than a percentage that would look more confident than it is — this is
 *  one user's history, volume is low, especially early on. */
import { AGAIN, EASY, GOOD, HARD } from "./constants";
import { localDateKey, STUDY_TIMEZONE } from "./local-day";
import type { ReviewGrade } from "./types";

export const CALIBRATION_MIN_BUCKET_SAMPLE = 5;

/** A Review reveal counts as abandoned if no grade follows within this
 *  many minutes. Reveal is Review-only — Quiz never calls recordReveal. */
export const ABANDONMENT_WINDOW_MINUTES = 10;

/** A term needs at least this many recent graded events in a track before
 *  its predicted-vs-actual gap is trusted enough to flag. */
export const ATTENTION_MIN_RECENT_EVENTS = 3;

/** Flag a term when the gap between mean predicted retrievability and
 *  actual pass rate, over its recent events in a track, exceeds this. */
export const ATTENTION_DIVERGENCE_THRESHOLD = 0.35;

/** Flag a term when its recall and recognition retrievability disagree by
 *  more than this — an independent tunable from ATTENTION_DIVERGENCE_THRESHOLD
 *  even though both are "how big a gap is worth a look," since one compares
 *  a track against its own prediction and this compares two different
 *  tracks against each other. */
export const CROSS_TRACK_DIVERGENCE_THRESHOLD = 0.35;

const BUCKET_COUNT = 10;

/** Mirrors lib/trace-queue's ReviewEvent / the review_event Postgres enum —
 *  kept as an independent local copy rather than imported, the same way
 *  the DB enum and lib/trace-queue's ReviewEvent are already two
 *  independently-maintained names for the same six values. lib/trace must
 *  not depend on lib/trace-queue (docs/trace.md's layering: trace-queue
 *  wires trace to Supabase, never the other way around). */
export type TraceEventName =
  | "read"
  | "reveal"
  | "review_pass"
  | "review_fail"
  | "quiz_pass"
  | "quiz_fail";

function excludeUnpredicted<T extends { retrievabilityBefore: number | null }>(
  rows: T[],
): Array<T & { retrievabilityBefore: number }> {
  return rows.filter(
    (row): row is T & { retrievabilityBefore: number } => row.retrievabilityBefore !== null,
  );
}

export type CalibrationBucket = {
  rangeStart: number;
  rangeEnd: number;
  n: number;
  /** null below CALIBRATION_MIN_BUCKET_SAMPLE — "not enough data," not 0%. */
  passRate: number | null;
};

export type CalibrationSummary = {
  buckets: CalibrationBucket[];
  /** Average |retrievability_before − outcome| across predicted rows.
   *  null (not 0/NaN) when there are none yet — a brand-new user must see
   *  "no data yet," not a misleadingly perfect 0% error. */
  meanAbsoluteError: number | null;
  n: number;
};

/** Buckets predicted retrievability against actual outcome for one track
 *  (call once with review_pass/review_fail rows, once with
 *  quiz_pass/quiz_fail rows — recall and recognition are different traces
 *  and shouldn't be blended). Rows with no prediction (a term's first-ever
 *  grade/answer — retrievability_before is null by construction, there was
 *  nothing to check yet) are excluded before any aggregation, so bucket n
 *  and the headline n always agree. */
export function summarizeCalibration(
  rows: Array<{ retrievabilityBefore: number | null; passed: boolean }>,
): CalibrationSummary {
  const predicted = excludeUnpredicted(rows);

  const bucketCounts = Array.from({ length: BUCKET_COUNT }, () => ({ n: 0, passCount: 0 }));
  let sumAbsError = 0;

  for (const row of predicted) {
    // Retrievability can land exactly on 1.0 — clamp so it stays in the
    // last bucket instead of overflowing into a nonexistent 11th one.
    const index = Math.min(Math.floor(row.retrievabilityBefore * BUCKET_COUNT), BUCKET_COUNT - 1);
    const bucket = bucketCounts[index]!;
    bucket.n += 1;
    if (row.passed) bucket.passCount += 1;
    sumAbsError += Math.abs(row.retrievabilityBefore - (row.passed ? 1 : 0));
  }

  const buckets: CalibrationBucket[] = bucketCounts.map((bucket, index) => ({
    rangeStart: index / BUCKET_COUNT,
    rangeEnd: (index + 1) / BUCKET_COUNT,
    n: bucket.n,
    passRate: bucket.n < CALIBRATION_MIN_BUCKET_SAMPLE ? null : bucket.passCount / bucket.n,
  }));

  return {
    buckets,
    meanAbsoluteError: predicted.length === 0 ? null : sumAbsError / predicted.length,
    n: predicted.length,
  };
}

export type AttentionFlag = {
  track: "recall" | "recognition";
  predicted: number;
  actual: number;
  sampleSize: number;
};

/** Compares what a term's current state predicts against what actually
 *  happened, over its recent events in one track — the "smart" part of the
 *  debug page: surfacing a mismatch instead of leaving it to be eyeballed.
 *  Caller pre-shapes/pre-filters events to one term's recent slice of one
 *  track (recall or recognition); this function doesn't interpret event
 *  names, it just compares means. Returns null when there's too little
 *  data to trust, or when predicted and actual agree closely enough. */
export function computeAttentionFlag(
  track: AttentionFlag["track"],
  events: Array<{ retrievabilityBefore: number | null; passed: boolean }>,
  opts: { minEvents?: number; threshold?: number } = {},
): AttentionFlag | null {
  const minEvents = opts.minEvents ?? ATTENTION_MIN_RECENT_EVENTS;
  const threshold = opts.threshold ?? ATTENTION_DIVERGENCE_THRESHOLD;

  const predicted = excludeUnpredicted(events);
  if (predicted.length < minEvents) return null;

  const meanPredicted =
    predicted.reduce((sum, e) => sum + e.retrievabilityBefore, 0) / predicted.length;
  const actualPassRate = predicted.filter((e) => e.passed).length / predicted.length;
  const divergence = Math.abs(meanPredicted - actualPassRate);

  if (divergence <= threshold) return null;

  return {
    track,
    predicted: meanPredicted,
    actual: actualPassRate,
    sampleSize: predicted.length,
  };
}

export type AbandonedReveal = {
  termId: string;
  revealedAt: Date;
};

/** A reveal with no matching grade within the window counts as abandoned.
 *  Reveal is Review-only (Quiz never calls recordReveal), so this only
 *  ever needs review-side events. For each reveal, look at the *next*
 *  chronological event for the same term — abandoned unless it's a
 *  review_pass/review_fail within the window. Needs only a sort + one pass
 *  per term, no hand-rolled session state machine, and correctly re-flags
 *  an earlier abandoned reveal even inside a reveal→reveal→grade sequence,
 *  since each reveal is judged against what immediately follows it. */
export function findAbandonedReveals(
  events: Array<{ termId: string; event: TraceEventName; createdAt: Date }>,
  opts: { windowMinutes?: number; now: Date },
): AbandonedReveal[] {
  const windowMs = (opts.windowMinutes ?? ABANDONMENT_WINDOW_MINUTES) * 60_000;

  const byTerm = new Map<string, Array<{ event: TraceEventName; createdAt: Date }>>();
  for (const e of events) {
    const list = byTerm.get(e.termId) ?? [];
    list.push({ event: e.event, createdAt: e.createdAt });
    byTerm.set(e.termId, list);
  }

  const abandoned: AbandonedReveal[] = [];

  for (const [termId, termEvents] of byTerm) {
    const sorted = [...termEvents].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i]!;
      if (current.event !== "reveal") continue;

      // Too young to judge yet — not abandoned, just not graded *yet*.
      if (opts.now.getTime() - current.createdAt.getTime() < windowMs) continue;

      const next = sorted[i + 1];
      const gradedInTime =
        next !== undefined &&
        (next.event === "review_pass" || next.event === "review_fail") &&
        next.createdAt.getTime() - current.createdAt.getTime() <= windowMs;

      if (!gradedInTime) {
        abandoned.push({ termId, revealedAt: current.createdAt });
      }
    }
  }

  return abandoned.sort((a, b) => b.revealedAt.getTime() - a.revealedAt.getTime());
}

/** How often each FSRS-5 grade actually gets used across review_pass/fail
 *  events — the real 1-4 grade, not just the pass/fail split. Grade is only
 *  ever set on review_pass/review_fail rows; other event types pass
 *  `grade: null` and are ignored here. */
export function summarizeGradeDistribution(
  rows: Array<{ grade: number | null }>,
): Record<ReviewGrade, number> {
  const counts: Record<ReviewGrade, number> = { [AGAIN]: 0, [HARD]: 0, [GOOD]: 0, [EASY]: 0 };
  for (const row of rows) {
    if (row.grade === AGAIN || row.grade === HARD || row.grade === GOOD || row.grade === EASY) {
      counts[row.grade] += 1;
    }
  }
  return counts;
}

export type RetrievabilityBucket = {
  rangeStart: number;
  rangeEnd: number;
  n: number;
};

/** Where every term's live retrievability currently sits, right now — a
 *  single-value histogram, not a predicted-vs-actual comparison like
 *  summarizeCalibration. Callers pass in the live recallRetrievability or
 *  recognitionRetrievability values already on each Queue row; null values
 *  (untested terms) are excluded, same reasoning as excludeUnpredicted
 *  above but this isn't paired data so it doesn't reuse that helper. */
export function summarizeRetrievabilityDistribution(
  values: Array<number | null>,
): RetrievabilityBucket[] {
  const bucketCounts = Array.from({ length: BUCKET_COUNT }, () => 0);

  for (const value of values) {
    if (value === null) continue;
    const index = Math.min(Math.floor(value * BUCKET_COUNT), BUCKET_COUNT - 1);
    bucketCounts[index]! += 1;
  }

  return bucketCounts.map((n, index) => ({
    rangeStart: index / BUCKET_COUNT,
    rangeEnd: (index + 1) / BUCKET_COUNT,
    n,
  }));
}

export type CrossTrackFlag = {
  recallRetrievability: number;
  recognitionRetrievability: number;
  divergence: number;
};

/** A term where recall and recognition retrievability disagree sharply is a
 *  different signal than computeAttentionFlag above — that compares one
 *  track against its own recent predicted-vs-actual history, this compares
 *  the two live tracks against each other for the same term right now. Null
 *  in either track (not enough history in one of them yet) means there's
 *  nothing to compare. */
export function computeCrossTrackFlag(
  recallRetrievability: number | null,
  recognitionRetrievability: number | null,
  opts: { threshold?: number } = {},
): CrossTrackFlag | null {
  if (recallRetrievability === null || recognitionRetrievability === null) return null;

  const threshold = opts.threshold ?? CROSS_TRACK_DIVERGENCE_THRESHOLD;
  const divergence = Math.abs(recallRetrievability - recognitionRetrievability);
  if (divergence <= threshold) return null;

  return { recallRetrievability, recognitionRetrievability, divergence };
}

export type ActivityDay = { date: string; read: number; review: number; quiz: number };

/** Day-bucketed event counts across the last `days` calendar days in
 *  STUDY_TIMEZONE, oldest first — including all-zero days, since the point
 *  is to show gaps in usage, not just totals. Answers "how much data
 *  actually backs these numbers," distinct from everything else in this
 *  file, which answers "is the algorithm predicting well." review_pass/
 *  review_fail combine into `review`; quiz_pass/quiz_fail combine into
 *  `quiz`, same as summarizeCalibration treats them as one track each. */
export function summarizeActivityTimeline(
  rows: Array<{ event: TraceEventName; createdAt: Date }>,
  opts: { now: Date; days: number },
): ActivityDay[] {
  const { now, days } = opts;
  const dayMs = 24 * 60 * 60 * 1000;

  const counts = new Map<string, { read: number; review: number; quiz: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const key = localDateKey(new Date(now.getTime() - i * dayMs), STUDY_TIMEZONE);
    counts.set(key, { read: 0, review: 0, quiz: 0 });
  }

  for (const row of rows) {
    const bucket = counts.get(localDateKey(row.createdAt, STUDY_TIMEZONE));
    if (!bucket) continue; // outside the requested window

    if (row.event === "read") bucket.read += 1;
    else if (row.event === "review_pass" || row.event === "review_fail") bucket.review += 1;
    else if (row.event === "quiz_pass" || row.event === "quiz_fail") bucket.quiz += 1;
  }

  return [...counts.entries()].map(([date, c]) => ({ date, ...c }));
}
