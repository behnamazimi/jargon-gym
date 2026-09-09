import { QuizStat } from "@/components/jargon/quiz/quiz-ui";
import type { PickContext } from "@/lib/trace-queue";
import type { QueueStats } from "./stats-strip-helpers";

export {
  computeQueueStats,
  computeCollectionBreakdown,
  type QueueStats,
} from "./stats-strip-helpers";
export { RetrievabilityDistributionBar } from "./retrievability-distribution-bar";
export { CollectionBreakdownTable } from "./collection-breakdown-table";

const CONTEXT_TRACK_LABEL: Record<PickContext, string> = {
  read: "never read",
  review: "never reviewed",
  quiz: "never quizzed",
};

/** Stat tiles, the same `<dl>` of `QuizStat`s the rest of the app already
 *  uses for a summary readout (see ReviewSummary) — a boxed KPI-card grid
 *  reads as "this is the dashboard's headline number," which a stray text
 *  line competing with dense per-term rows below it does not. Color always
 *  pairs with an adjacent text label (never color alone), per the
 *  accessibility "Color Only" rule. */
export function StatsStrip({ stats, context }: { stats: QueueStats; context: PickContext }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <QuizStat label="Total" value={stats.total} />
      <QuizStat label="Known" value={<span className="text-success">{stats.known}</span>} />
      <QuizStat label="Learning" value={<span className="text-warning">{stats.learning}</span>} />
      <QuizStat
        label="Unknown"
        value={<span className="text-base-content/70">{stats.unknown}</span>}
      />
      <QuizStat label={CONTEXT_TRACK_LABEL[context]} value={stats.untestedInTrack} />
      <QuizStat
        label="Flagged"
        value={<span className="text-error">{stats.attentionFlagged}</span>}
        variant={stats.attentionFlagged > 0 ? "primary" : "default"}
      />
    </dl>
  );
}
