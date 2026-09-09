/** Predicted-vs-actual calibration math — see calibration.ts for the
 *  file-group's overall scope and constraints.
 *  @see docs/trace.md
 */

export const CALIBRATION_MIN_BUCKET_SAMPLE = 5;

/** A term needs at least this many recent graded events in a track before
 *  its predicted-vs-actual gap is trusted enough to flag. */
export const ATTENTION_MIN_RECENT_EVENTS = 3;

/** Flag a term when the gap between mean predicted retrievability and
 *  actual pass rate, over its recent events in a track, exceeds this. */
export const ATTENTION_DIVERGENCE_THRESHOLD = 0.35;

const BUCKET_COUNT = 10;

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

export const CROSS_TRACK_DIVERGENCE_THRESHOLD = 0.35;

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
