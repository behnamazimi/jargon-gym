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
