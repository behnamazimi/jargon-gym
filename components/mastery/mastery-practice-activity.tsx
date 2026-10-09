"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { GradeDistributionSummary, WebStatsSnapshot } from "@/lib/mastery/collection-stats";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AGAIN, EASY, GOOD, HARD, type ReviewGrade } from "@/lib/trace";
import { cn, pluralize } from "@/lib/utils";

/** TRACE has no backlog to clear — a term with no history is simply served
 *  when this tier has room for it. This is a snapshot of current exposure,
 *  not a queue count. */
function formatUnseenLine(unseen: number): string {
  return unseen === 0 ? "Everything started" : `${pluralize(unseen, "term")} not started`;
}

function RollupRow({
  label,
  verb,
  unseen,
  today,
}: {
  label: string;
  verb: string;
  unseen: number;
  today: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 text-sm">
      <span className="font-medium text-base-content">{label}</span>
      <span className="flex flex-col items-end text-base-content/70">
        <span className="tabular-nums">{formatUnseenLine(unseen)}</span>
        <span className="tabular-nums">
          {today} {verb} today
        </span>
      </span>
    </div>
  );
}

const GRADE_LABEL: Record<ReviewGrade, string> = {
  [AGAIN]: "Again",
  [HARD]: "Hard",
  [GOOD]: "Good",
  [EASY]: "Easy",
};
const GRADE_ORDER: ReviewGrade[] = [AGAIN, HARD, GOOD, EASY];

/** Plain distribution, no verdict — what's "too generous" is subjective,
 *  this just shows the grading habit itself. */
function GradeDistributionRow({ summary }: { summary: GradeDistributionSummary }) {
  return (
    <div className="flex flex-col gap-2 py-2 text-sm">
      <span className="font-medium text-base-content">Grading</span>
      <dl className="m-0 grid grid-cols-4 gap-2">
        {GRADE_ORDER.map((grade) => (
          <div key={grade} className="flex flex-col">
            <dt className="text-xs text-base-content/70">{GRADE_LABEL[grade]}</dt>
            <dd className="m-0 tabular-nums text-base-content">
              {Math.round((summary.counts[grade] / summary.total) * 100)}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Queue/grading diagnostics — secondary to the per-collection breakdown,
 *  so it's tucked behind a disclosure rather than sitting in the main
 *  flow, though open by default. */
export function MasteryPracticeActivity({ stats }: { stats: WebStatsSnapshot }) {
  const [open, setOpen] = useState(true);

  if (stats.activeCollections.length === 0) return null;

  return (
    <Collapsible
      isExpanded={open}
      onExpandedChange={setOpen}
      className="shadow-surface rounded-box bg-base-100 p-5"
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-field border-none bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <span className="text-sm font-medium text-base-content">Practice activity</span>
        <ChevronRight
          className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")}
          aria-hidden
          strokeWidth={2}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 divide-y divide-base-content/10">
          <RollupRow
            label="Read"
            verb="read"
            unseen={stats.rollup.read.unseen}
            today={stats.today.read}
          />
          <RollupRow
            label="Review"
            verb="reviewed"
            unseen={stats.rollup.review.unseen}
            today={stats.today.review}
          />
          <RollupRow
            label="Quiz"
            verb="quizzed"
            unseen={stats.rollup.quiz.unseen}
            today={stats.today.quiz}
          />
          {stats.gradeDistribution ? (
            <GradeDistributionRow summary={stats.gradeDistribution} />
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
