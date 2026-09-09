import { History } from "lucide-react";
import { QuizPanel, QuizPanelBody, QuizPanelHeader } from "@/components/jargon/quiz/quiz-ui";
import { AGAIN, EASY, GOOD, HARD, type ActivityDay, type CalibrationSummary } from "@/lib/trace";
import { formatPercent, GRADE_LABELS } from "./format";

/** Day-bucketed usage volume, most recent first — answers "how much data
 *  actually backs the numbers below" (trace-formula.md's own caveat that
 *  today's constants are reasoned defaults, not fit to real usage yet). A
 *  table, not a chart: 14 days × 3 categories is 42 cells, the same
 *  envelope CalibrationTable already handles cleanly at this density, and
 *  every count stays legible without hover. */
export function ActivityTimeline({ days }: { days: ActivityDay[] }) {
  const totalEvents = days.reduce((sum, day) => sum + day.read + day.review + day.quiz, 0);
  return (
    <QuizPanel>
      <QuizPanelHeader
        icon={History}
        title="Activity"
        description={`Reads, reviews, and quizzes over the last ${days.length} days — how much recent usage backs the numbers below.`}
        aside={<span className="text-xs text-base-content/50">n={totalEvents}</span>}
      />
      <QuizPanelBody>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Read</th>
                <th>Review</th>
                <th>Quiz</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((day) => (
                <tr key={day.date}>
                  <td className="tabular-nums">{day.date}</td>
                  <td className="tabular-nums">{day.read}</td>
                  <td className="tabular-nums">{day.review}</td>
                  <td className="tabular-nums">{day.quiz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QuizPanelBody>
    </QuizPanel>
  );
}

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

export function CalibrationTable({
  title,
  summary,
}: {
  title: string;
  summary: CalibrationSummary;
}) {
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

export function GradeDistribution({ distribution }: { distribution: Record<number, number> }) {
  const total = Object.values(distribution).reduce((sum, n) => sum + n, 0);
  const grades = [AGAIN, HARD, GOOD, EASY];

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="m-0 text-sm font-semibold">Review grade distribution</h3>
        <span className="text-xs text-base-content/50">n={total}</span>
      </div>
      {total === 0 ? (
        <p className="m-0 text-xs text-base-content/50">no graded events yet</p>
      ) : (
        <ul className="m-0 list-none space-y-1 p-0">
          {grades.map((grade) => (
            <li key={grade} className="flex items-center gap-2 text-xs text-base-content/60">
              <span className="w-12 shrink-0">{GRADE_LABELS[grade]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-base-200">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${((distribution[grade] ?? 0) / total) * 100}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right tabular-nums">
                {distribution[grade] ?? 0} ({formatPercent((distribution[grade] ?? 0) / total)})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
