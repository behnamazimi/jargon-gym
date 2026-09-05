"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { GradeDistributionSummary, WebStatsSnapshot } from "@/lib/jargon/collection-stats";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AGAIN, EASY, GOOD, HARD, type ReviewGrade } from "@/lib/trace";
import { cn } from "@/lib/utils";

/** TRACE has no backlog to clear — a term with no history just ranks first
 *  next time this tier comes up. This is a snapshot of current exposure,
 *  not a queue count. */
function formatUnseenLine(unseen: number): string {
  return unseen === 0 ? "Everything started" : `${unseen} never started`;
}

function RollupRow({ label, unseen, today }: { label: string; unseen: number; today: number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="font-medium text-base-content">{label}</span>
      <span className="text-base-content/60">
        {formatUnseenLine(unseen)} · {today} today
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
function formatGradeDistribution(summary: GradeDistributionSummary): string {
  return GRADE_ORDER.map((grade) => {
    const percent = Math.round((summary.counts[grade] / summary.total) * 100);
    return `${GRADE_LABEL[grade]} ${percent}%`;
  }).join(" · ");
}

function GradeDistributionRow({ summary }: { summary: GradeDistributionSummary }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="font-medium text-base-content">Grading</span>
      <span className="text-base-content/60">{formatGradeDistribution(summary)}</span>
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
      className="shadow-surface rounded-2xl bg-base-100 p-4"
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border-none bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <span className="text-sm font-semibold text-base-content">Practice activity</span>
        <ChevronRight
          className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")}
          aria-hidden
          strokeWidth={2}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 divide-y divide-base-content/10">
          <RollupRow label="Read" unseen={stats.rollup.read.unseen} today={stats.today.read} />
          <RollupRow
            label="Review"
            unseen={stats.rollup.review.unseen}
            today={stats.today.review}
          />
          <RollupRow label="Quiz" unseen={stats.rollup.quiz.unseen} today={stats.today.quiz} />
          {stats.gradeDistribution ? (
            <GradeDistributionRow summary={stats.gradeDistribution} />
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
