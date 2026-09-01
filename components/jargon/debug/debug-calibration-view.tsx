import type { CalibrationViewData } from "@/app/(private)/jargon/debug/actions";
import { QuizPanel, QuizPanelBody } from "@/components/jargon/quiz/quiz-ui";
import type { CalibrationSummary } from "@/lib/trace";
import { formatPercent, formatRelativeMinutes } from "./format";

function CalibrationHeadline({ summary }: { summary: CalibrationSummary }) {
  if (summary.meanAbsoluteError === null) {
    return <span className="text-xs text-base-content/50">no graded events yet</span>;
  }
  return (
    <span className="text-xs text-base-content/50">
      mean error {formatPercent(summary.meanAbsoluteError)} · n={summary.n}
    </span>
  );
}

function CalibrationTable({ title, summary }: { title: string; summary: CalibrationSummary }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="m-0 text-sm font-semibold">{title}</h3>
        <CalibrationHeadline summary={summary} />
      </div>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Predicted retrievability</th>
              <th>n</th>
              <th>Actual pass rate</th>
            </tr>
          </thead>
          <tbody>
            {summary.buckets.map((bucket) => (
              <tr key={bucket.rangeStart}>
                <td className="tabular-nums">
                  {formatPercent(bucket.rangeStart)}–{formatPercent(bucket.rangeEnd)}
                </td>
                <td className="tabular-nums">{bucket.n}</td>
                <td className="tabular-nums">
                  {bucket.passRate === null ? (
                    <span className="text-base-content/40">not enough data</span>
                  ) : (
                    formatPercent(bucket.passRate)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Calibrating against whichever single account is currently logged in —
 *  RLS scopes review_events reads to auth.uid(), this is one user's
 *  history, not an aggregate. Say so, and be honest that most buckets
 *  will read "not enough data" until there's real usage behind them. */
export function DebugCalibrationView({ data }: { data: CalibrationViewData | null }) {
  if (!data) {
    return <p className="m-0 text-sm text-base-content/60">No calibration data available.</p>;
  }

  return (
    <QuizPanel>
      <QuizPanelBody>
        <p className="m-0 text-xs text-base-content/50">
          Based on your own review history — not an aggregate across users.
        </p>

        <CalibrationTable title="Recall (Review)" summary={data.recall} />
        <CalibrationTable title="Recognition (Quiz)" summary={data.recognition} />

        <div className="space-y-2">
          <h3 className="m-0 text-sm font-semibold">Abandoned reveals</h3>
          {data.abandonedReveals.length === 0 ? (
            <p className="m-0 text-xs text-base-content/50">
              No reveals without a follow-up grade in the last window.
            </p>
          ) : (
            <ul className="m-0 list-none space-y-1 p-0">
              {data.abandonedReveals.map((entry) => (
                <li
                  key={`${entry.termId}-${entry.revealedAt.toISOString()}`}
                  className="text-xs text-base-content/60"
                >
                  {entry.term} · revealed {formatRelativeMinutes(entry.revealedAt.toISOString())}
                </li>
              ))}
            </ul>
          )}
        </div>
      </QuizPanelBody>
    </QuizPanel>
  );
}
