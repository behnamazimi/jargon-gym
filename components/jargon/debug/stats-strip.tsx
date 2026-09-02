import type { DebugScoredRow } from "@/app/(private)/jargon/debug/actions";
import { QuizStat } from "@/components/jargon/quiz/quiz-ui";
import { summarizeRetrievabilityDistribution, type RetrievabilityBucket } from "@/lib/trace";
import type { PickContext } from "@/lib/trace-queue";
import type { StudyCollection } from "@/lib/study/types";
import { formatPercent } from "./format";

export type QueueStats = {
  total: number;
  known: number;
  learning: number;
  unknown: number;
  /** Untested in whichever track the selected context ranks by — read
   *  count for Read, recall for Review, recognition for Quiz. */
  untestedInTrack: number;
  attentionFlagged: number;
};

function untestedInTrack(row: DebugScoredRow, context: PickContext): boolean {
  if (context === "read") return row.readCount === 0;
  if (context === "review") return row.recallStability === null;
  return row.quizKnowledgePosterior === null;
}

/** Shared by computeQueueStats and computeCollectionBreakdown so "flagged"
 *  has exactly one definition instead of two that could drift. */
function isFlagged(row: DebugScoredRow): boolean {
  return row.attentionFlags.length > 0 || row.crossTrackFlag !== null;
}

export function computeQueueStats(rows: DebugScoredRow[], context: PickContext): QueueStats {
  const stats: QueueStats = {
    total: rows.length,
    known: 0,
    learning: 0,
    unknown: 0,
    untestedInTrack: 0,
    attentionFlagged: 0,
  };

  for (const row of rows) {
    stats[row.knownLabel] += 1;
    if (untestedInTrack(row, context)) stats.untestedInTrack += 1;
    if (isFlagged(row)) stats.attentionFlagged += 1;
  }

  return stats;
}

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

/** One continuous 10-segment strip (a decile heat-map, not 10 separate
 *  boxes) — fill opacity scales with each bucket's share of the busiest
 *  bucket. Counts print above non-empty segments directly, not only on
 *  hover, so it's readable without moused-over discovery. */
function HeatStrip({ label, buckets }: { label: string; buckets: RetrievabilityBucket[] }) {
  const total = buckets.reduce((sum, b) => sum + b.n, 0);
  const max = Math.max(1, ...buckets.map((b) => b.n));
  return (
    <div className="space-y-1">
      <p className="m-0 text-xs font-medium text-base-content/70">
        {label} <span className="font-normal text-base-content/40">(n={total})</span>
      </p>
      <div className="flex items-end">
        {buckets.map((bucket) => (
          <span
            key={bucket.rangeStart}
            className="flex-1 text-center text-2xs tabular-nums text-base-content/50"
          >
            {bucket.n > 0 ? bucket.n : " "}
          </span>
        ))}
      </div>
      <div className="flex h-2.5 divide-x divide-base-100 overflow-hidden rounded-full bg-base-200">
        {buckets.map((bucket) => (
          <div
            key={bucket.rangeStart}
            className="h-full flex-1 bg-primary"
            style={{ opacity: bucket.n > 0 ? Math.max(0.25, bucket.n / max) : 0 }}
            title={`${formatPercent(bucket.rangeStart)}–${formatPercent(bucket.rangeEnd)}: ${bucket.n} term${bucket.n === 1 ? "" : "s"}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-2xs text-base-content/40">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/** Where every term's live retrievability sits right now — distinct from
 *  the Calibration tab, which checks predicted-vs-actual against past
 *  graded events. This is a snapshot of the whole pool's current state,
 *  including terms that have never been graded. */
export function RetrievabilityDistributionBar({ rows }: { rows: DebugScoredRow[] }) {
  const recall = summarizeRetrievabilityDistribution(rows.map((row) => row.recallRetrievability));
  const recognition = summarizeRetrievabilityDistribution(
    rows.map((row) => row.recognitionRetrievability),
  );

  return (
    <div className="space-y-2">
      <h3 className="m-0 text-sm font-semibold">Retrievability spread</h3>
      <p className="m-0 text-xs text-base-content/50">
        How likely you are to still remember each term right now, grouped into 10 bands from 0%
        (probably forgotten) to 100% (fresh). A bar's height is how many terms fall in that band.
        Recall = tested by writing the answer yourself (Review); Recognition = tested by picking it
        out of options (Quiz).
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <HeatStrip label="Recall retrievability" buckets={recall} />
        <HeatStrip label="Recognition retrievability" buckets={recognition} />
      </div>
    </div>
  );
}

export type CollectionStat = {
  domainId: string;
  name: string;
  total: number;
  known: number;
  learning: number;
  unknown: number;
  flagged: number;
};

/** Pool-wide StatsStrip/RetrievabilityDistributionBar above answer "how is
 *  everything doing"; this answers "which collection is lagging" — grouped
 *  by domainId instead of collapsed across it. Collections with no rows in
 *  the current selection are dropped rather than shown at zero. */
export function computeCollectionBreakdown(
  rows: DebugScoredRow[],
  collections: StudyCollection[],
): CollectionStat[] {
  const byDomain = new Map<string, CollectionStat>(
    collections.map((collection) => [
      collection.id,
      {
        domainId: collection.id,
        name: collection.name,
        total: 0,
        known: 0,
        learning: 0,
        unknown: 0,
        flagged: 0,
      },
    ]),
  );

  for (const row of rows) {
    const stat = byDomain.get(row.domainId);
    if (!stat) continue;
    stat.total += 1;
    stat[row.knownLabel] += 1;
    if (isFlagged(row)) stat.flagged += 1;
  }

  return [...byDomain.values()].filter((stat) => stat.total > 0);
}

export function CollectionBreakdownTable({ stats }: { stats: CollectionStat[] }) {
  if (stats.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="m-0 text-sm font-semibold">By collection</h3>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Collection</th>
              <th>Total</th>
              <th>Known</th>
              <th>Learning</th>
              <th>Unknown</th>
              <th>Flagged</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.domainId}>
                <td>{stat.name}</td>
                <td className="tabular-nums">{stat.total}</td>
                <td className="tabular-nums text-success">{stat.known}</td>
                <td className="tabular-nums text-warning">{stat.learning}</td>
                <td className="tabular-nums text-base-content/70">{stat.unknown}</td>
                <td className="tabular-nums text-error">{stat.flagged}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
