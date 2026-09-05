import type {
  CollectionPaceInsight,
  CollectionStatBreakdown,
  LifetimeTotals,
} from "@/lib/jargon/collection-stats";
import type { MilestoneEstimate } from "@/lib/trace";

/** Raw days → a friendly, coarse unit — never raw decimals, since the
 *  underlying rate is noisy and shouldn't read as more precise than it is. */
function formatDayRange(lowDays: number, highDays: number): string {
  const unit: "day" | "week" | "month" = lowDays < 14 ? "day" : lowDays < 60 ? "week" : "month";
  const divisor = unit === "day" ? 1 : unit === "week" ? 7 : 30;
  const low = Math.max(1, Math.round(lowDays / divisor));
  const high = Math.max(low, Math.round(highDays / divisor));
  const word = unit + (high === 1 ? "" : "s");
  return low === high ? `~${low} ${word}` : `~${low}-${high} ${word}`;
}

/** One milestone's line, or null if there's nothing to say about it (no
 *  terms waiting for this stage). Never combines the two milestones' time
 *  estimates into one number — they compete for the same study time, so a
 *  sum would overstate precision it doesn't have. */
function formatMilestone(estimate: MilestoneEstimate, label: string): string | null {
  switch (estimate.kind) {
    case "none":
      return null;
    case "count": {
      const noun = estimate.remaining === 1 ? "term" : "terms";
      return `${estimate.remaining} ${noun} away from ${label}`;
    }
    case "insufficientData": {
      const noun = estimate.remaining === 1 ? "term" : "terms";
      return `${estimate.remaining} ${noun} away from ${label} — not enough history yet`;
    }
    case "estimate": {
      const noun = estimate.remaining === 1 ? "term" : "terms";
      return `${estimate.remaining} ${noun} away from ${label} (${formatDayRange(estimate.lowDays, estimate.highDays)})`;
    }
  }
}

export function formatPaceLine(insight: CollectionPaceInsight): string | null {
  const parts = [
    formatMilestone(insight.toLearning, "Learning"),
    formatMilestone(insight.toMastery, "Mastered"),
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function formatUnseenFootnote(collection: CollectionStatBreakdown): string {
  return `${collection.unseenCount} never read`;
}

/** Volume, not accuracy — a running count of exposure, not a right/wrong
 *  rate. One quiet line, not a headline. */
export function formatLifetimeTotals(totals: LifetimeTotals): string {
  return [
    `${totals.reviews.toLocaleString()} reviews`,
    `${totals.quizAnswers.toLocaleString()} quiz answers`,
    `${totals.termsRead.toLocaleString()} terms read`,
  ].join(" · ");
}
