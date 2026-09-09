import { SlidersHorizontal, Target, Timer } from "lucide-react";
import type { CalibrationViewData } from "@/app/(private)/jargon/debug/actions";
import { CollapsiblePanel } from "@/components/jargon/debug/collapsible-panel";
import { QuizPanel, QuizPanelBody, QuizPanelHeader } from "@/components/jargon/quiz/quiz-ui";
import {
  FAMILIARITY_CAP,
  FAMILIARITY_DECAY_RATE,
  FAMILIARITY_GROWTH_RATE,
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
} from "@/lib/trace";
import { formatPercent, formatRelativeMinutes } from "./format";
import { CalibrationTable, GradeDistribution } from "./debug-calibration-tables";

/** Calibrating against whichever single account is currently logged in —
 *  RLS scopes review_events reads to auth.uid(), this is one user's
 *  history, not an aggregate. Say so, and be honest that most buckets
 *  will read "not enough data" until there's real usage behind them. */
export function PredictionAccuracy({ data }: { data: CalibrationViewData }) {
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

export function AbandonedReveals({ data }: { data: CalibrationViewData }) {
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

export function TraceConstantsPanel() {
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
