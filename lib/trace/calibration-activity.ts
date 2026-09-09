/** Event-log diagnostics — abandonment, grade usage, and activity timeline.
 *  See calibration.ts for the file-group's overall scope and constraints.
 *  @see docs/trace.md
 */

import { AGAIN, EASY, GOOD, HARD } from "./constants";
import { localDateKey, STUDY_TIMEZONE } from "./local-day";
import type { ReviewGrade } from "./types";

/** A Review reveal counts as abandoned if no grade follows within this
 *  many minutes. Reveal is Review-only — Quiz never calls recordReveal. */
export const ABANDONMENT_WINDOW_MINUTES = 10;

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

export type ActivityDay = { date: string; read: number; review: number; quiz: number };

/** Day-bucketed event counts across the last `days` calendar days in
 *  STUDY_TIMEZONE, oldest first — including all-zero days, since the point
 *  is to show gaps in usage, not just totals. Answers "how much data
 *  actually backs these numbers," distinct from everything else in this
 *  file group, which answers "is the algorithm predicting well." review_pass/
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
