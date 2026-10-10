import { daysUntilNextReview, type ReviewGrade } from "@/lib/trace";
import type { ReviewRecallState } from "@/lib/terms/term-card";

/** Days until the term comes back after each grade, if graded at `now`. */
export function nextReviewDays(recall: ReviewRecallState, now: Date): Record<ReviewGrade, number> {
  return daysUntilNextReview(
    {
      readCount: recall.readCount,
      lastReadAt: recall.lastReadAt ? new Date(recall.lastReadAt) : null,
      recallStability: recall.stability,
      recallDifficulty: recall.difficulty,
      lastReviewRecallAt: recall.lastReviewAt ? new Date(recall.lastReviewAt) : null,
    },
    now,
  );
}

type Unit = { short: string; word: string; days: number; until: number };

const UNITS: Unit[] = [
  { short: "m", word: "minute", days: 1 / (24 * 60), until: 60 },
  { short: "h", word: "hour", days: 1 / 24, until: 24 },
  { short: "d", word: "day", days: 1, until: 60 },
  { short: "mo", word: "month", days: 30, until: 12 },
];
const YEAR: Unit = { short: "y", word: "year", days: 365, until: Infinity };

/** The largest unit the rounded value still fits under, so 23.6 hours reads
 *  as 1 day, not 24 hours. Years keep one decimal. */
function measure(days: number): { count: number; unit: Unit } {
  for (const unit of UNITS) {
    const count = Math.round(days / unit.days);
    if (count < unit.until) return { count: Math.max(1, count), unit };
  }
  return { count: Math.round((days / YEAR.days) * 10) / 10, unit: YEAR };
}

/** Short label for how long until a term comes back, e.g. "45m", "5h", "3d",
 *  "2mo", "1.5y". Rounded, since it's an estimate. */
export function formatNextReview(days: number): string {
  const { count, unit } = measure(days);
  return `${count}${unit.short}`;
}

/** The same estimate in words, for screen readers. */
export function describeNextReview(days: number): string {
  const { count, unit } = measure(days);
  return `back in about ${count} ${unit.word}${count === 1 ? "" : "s"}`;
}
