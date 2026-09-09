import type { DebugScoredRow } from "@/app/(private)/jargon/debug/actions";
import { summarizeRetrievabilityDistribution, type RetrievabilityBucket } from "@/lib/trace";
import { formatPercent } from "./format";

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
            {bucket.n > 0 ? bucket.n : " "}
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
