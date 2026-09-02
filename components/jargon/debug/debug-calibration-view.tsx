import { History, SlidersHorizontal, Target, Timer } from "lucide-react";
import type { CalibrationViewData } from "@/app/(private)/jargon/debug/actions";
import { CollapsiblePanel } from "@/components/jargon/debug/collapsible-panel";
import { QuizPanel, QuizPanelBody, QuizPanelHeader } from "@/components/jargon/quiz/quiz-ui";
import {
  AGAIN,
  EASY,
  FAMILIARITY_CAP,
  FAMILIARITY_DECAY_RATE,
  FAMILIARITY_GROWTH_RATE,
  GOOD,
  HARD,
  KNOWN_MIN_TEST_COUNT,
  KNOWN_THRESHOLD,
  MASTERY_WEIGHT_FAMILIARITY,
  MASTERY_WEIGHT_RECALL,
  MASTERY_WEIGHT_RECOGNITION,
  P_CORRECT_GIVEN_GUESS_MCQ,
  P_CORRECT_GIVEN_GUESS_TF,
  RETRIEVABILITY_DECAY_SCALE,
  SESSION_COOLDOWN_RETRIEVABILITY,
  UNKNOWN_THRESHOLD,
  type ActivityDay,
  type CalibrationSummary,
} from "@/lib/trace";
import { formatPercent, formatRelativeMinutes, GRADE_LABELS } from "./format";

/** Day-bucketed usage volume, most recent first — answers "how much data
 *  actually backs the numbers below" (trace-formula.md's own caveat that
 *  today's constants are reasoned defaults, not fit to real usage yet). A
 *  table, not a chart: 14 days × 3 categories is 42 cells, the same
 *  envelope CalibrationTable already handles cleanly at this density, and
 *  every count stays legible without hover. */
function ActivityTimeline({ days }: { days: ActivityDay[] }) {
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

function GradeDistribution({ distribution }: { distribution: Record<number, number> }) {
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

/** Calibrating against whichever single account is currently logged in —
 *  RLS scopes review_events reads to auth.uid(), this is one user's
 *  history, not an aggregate. Say so, and be honest that most buckets
 *  will read "not enough data" until there's real usage behind them. */
function PredictionAccuracy({ data }: { data: CalibrationViewData }) {
  return (
    <QuizPanel>
      <QuizPanelHeader
        icon={Target}
        title="Prediction accuracy"
        description="Does predicted retrievability match what actually happens? Based on your own review history — not an aggregate across users."
      />
      <QuizPanelBody>
        <CalibrationTable title="Recall (Review)" summary={data.recall} />
        <GradeDistribution distribution={data.gradeDistribution} />
        <CalibrationTable title="Recognition (Quiz)" summary={data.recognition} />
      </QuizPanelBody>
    </QuizPanel>
  );
}

function AbandonedReveals({ data }: { data: CalibrationViewData }) {
  return (
    <QuizPanel>
      <QuizPanelHeader
        icon={Timer}
        title="Abandoned reveals"
        description="Review reveals with no follow-up grade within 10 minutes."
      />
      <QuizPanelBody>
        {data.abandonedReveals.length === 0 ? (
          <p className="m-0 text-sm text-base-content/60">
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
      </QuizPanelBody>
    </QuizPanel>
  );
}

const TRACE_CONSTANTS: Array<{ label: string; value: string }> = [
  { label: "Familiarity growth rate", value: FAMILIARITY_GROWTH_RATE.toString() },
  { label: "Familiarity decay rate", value: FAMILIARITY_DECAY_RATE.toString() },
  { label: "Familiarity cap", value: formatPercent(FAMILIARITY_CAP) },
  { label: "Retrievability decay scale", value: RETRIEVABILITY_DECAY_SCALE.toString() },
  { label: "Mastery weight — familiarity", value: formatPercent(MASTERY_WEIGHT_FAMILIARITY) },
  { label: "Mastery weight — recall", value: formatPercent(MASTERY_WEIGHT_RECALL) },
  { label: "Mastery weight — recognition", value: formatPercent(MASTERY_WEIGHT_RECOGNITION) },
  { label: "Known threshold", value: formatPercent(KNOWN_THRESHOLD) },
  { label: "Unknown threshold", value: formatPercent(UNKNOWN_THRESHOLD) },
  { label: "Known minimum test count", value: KNOWN_MIN_TEST_COUNT.toString() },
  { label: "Session cooldown", value: formatPercent(SESSION_COOLDOWN_RETRIEVABILITY) },
  { label: "Guess rate — multiple choice", value: formatPercent(P_CORRECT_GIVEN_GUESS_MCQ) },
  { label: "Guess rate — true/false", value: formatPercent(P_CORRECT_GIVEN_GUESS_TF) },
];

function TraceConstantsPanel() {
  return (
    <QuizPanel>
      <CollapsiblePanel
        icon={<SlidersHorizontal className="size-5" aria-hidden strokeWidth={1.5} />}
        title="Engine constants"
        description="The tunable numbers TRACE's formulas use today — reasoned defaults, not fit to real usage yet."
      >
        <ul className="m-0 list-none space-y-1 p-0">
          {TRACE_CONSTANTS.map((constant) => (
            <li
              key={constant.label}
              className="flex items-center justify-between gap-3 text-xs text-base-content/60"
            >
              <span>{constant.label}</span>
              <span className="tabular-nums">{constant.value}</span>
            </li>
          ))}
        </ul>
      </CollapsiblePanel>
    </QuizPanel>
  );
}

export function DebugCalibrationView({ data }: { data: CalibrationViewData | null }) {
  if (!data) {
    return <p className="m-0 text-sm text-base-content/60">No calibration data available.</p>;
  }

  return (
    <>
      <ActivityTimeline days={data.activityTimeline} />
      <PredictionAccuracy data={data} />
      <AbandonedReveals data={data} />
      <TraceConstantsPanel />
    </>
  );
}
