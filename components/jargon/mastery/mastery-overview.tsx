"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import type {
  CollectionPaceInsight,
  CollectionStatBreakdown,
  GradeDistributionSummary,
  LifetimeTotals,
  WebStatsSnapshot,
} from "@/lib/jargon/collection-stats";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AGAIN, EASY, GOOD, HARD, type MilestoneEstimate, type ReviewGrade } from "@/lib/trace";
import { cn } from "@/lib/utils";

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
    case "count":
      return `${estimate.remaining} to ${label} left`;
    case "insufficientData":
      return `${estimate.remaining} to ${label} — not enough history yet`;
    case "estimate":
      return `${estimate.remaining} to ${label} (${formatDayRange(estimate.lowDays, estimate.highDays)})`;
  }
}

function formatPaceLine(insight: CollectionPaceInsight): string | null {
  const parts = [
    formatMilestone(insight.toLearning, "Learning"),
    formatMilestone(insight.toMastery, "Mastered"),
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** TRACE has no backlog to clear — a term with no history just ranks first
 *  next time this tier comes up. This is a snapshot of current exposure,
 *  not a queue count. */
function formatUnseenLine(unseen: number): string {
  return unseen === 0 ? "Everything started" : `${unseen} never started`;
}

function formatUnseenFootnote(collection: CollectionStatBreakdown): string {
  return `${collection.unseenCount} never read`;
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

/** Volume, not accuracy — a running count of exposure, not a right/wrong
 *  rate. One quiet line, not a headline. */
function formatLifetimeTotals(totals: LifetimeTotals): string {
  return [
    `${totals.reviews.toLocaleString()} reviews`,
    `${totals.quizAnswers.toLocaleString()} quiz answers`,
    `${totals.termsRead.toLocaleString()} terms read`,
  ].join(" · ");
}

type CollectionProgress = {
  id: string;
  name: string;
  termsLearnedCount: number;
  totalCount: number;
  percentage: number;
};

/** A single collection's progress as a flat row — no card-in-card nesting,
 *  just a divider between entries in the list it's rendered inside. */
function CollectionRow({
  collection,
  footnote,
  paceLine,
  muted,
}: {
  collection: CollectionProgress;
  footnote?: string;
  paceLine?: string | null;
  muted?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5 py-2.5", muted && "opacity-60")}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-base-content">{collection.name}</span>
        <span className="shrink-0 tabular-nums text-base-content/60">
          {collection.termsLearnedCount}/{collection.totalCount} learned
        </span>
      </div>
      <progress
        className="progress progress-primary h-1.5 w-full"
        value={collection.percentage}
        max={100}
        aria-label={`${collection.name} learned ${collection.percentage}%`}
      />
      {footnote ? <p className="text-xs text-base-content/50">{footnote}</p> : null}
      {paceLine ? <p className="text-xs text-base-content/50">{paceLine}</p> : null}
    </div>
  );
}

type MasteryOverviewProps = {
  stats: WebStatsSnapshot;
  /** §8 "current strength" — live OverallMastery, 0–1. Decays with
   *  inactivity by design (used internally for ranking, shown here too). */
  currentStrength: number;
  /** §8 "terms learned" — high-water mark, never decreases. */
  termsLearned: number;
};

/** Collapsed by default so the mastery list stays the focus — expand for
 *  what's stale/struggling/waiting and the per-collection breakdown. */
export function MasteryOverview({ stats, currentStrength, termsLearned }: MasteryOverviewProps) {
  const [open, setOpen] = useState(false);
  const strengthPercent = Math.round(currentStrength * 100);
  const hasLifetimeTotals =
    stats.lifetimeTotals.reviews +
      stats.lifetimeTotals.quizAnswers +
      stats.lifetimeTotals.termsRead >
    0;

  return (
    <Collapsible
      isExpanded={open}
      onExpandedChange={setOpen}
      className="shadow-surface rounded-2xl bg-base-100 p-4"
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-baseline justify-between gap-3 rounded-lg border-none bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-base-content">
            {strengthPercent}% current strength
          </p>
          <p className="mt-0.5 text-xs text-base-content/50">
            <span className="tabular-nums">{termsLearned}</span> terms learned
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium uppercase tracking-wide text-base-content/50">
          <span>
            {stats.activeCount} active · {stats.pausedCount} paused
          </span>
          <ChevronRight
            className={cn("size-3.5 transition-transform", open && "rotate-90")}
            aria-hidden
            strokeWidth={2}
          />
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 space-y-4">
          {stats.activeCollections.length > 0 ? (
            <div className="divide-y divide-base-content/10">
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
          ) : null}

          {hasLifetimeTotals ? (
            <p className="m-0 text-xs text-base-content/50">
              {formatLifetimeTotals(stats.lifetimeTotals)}
            </p>
          ) : null}

          {stats.activeCollections.length > 0 ? (
            <div className="divide-y divide-base-content/10">
              {stats.activeCollections.map((collection) => (
                <CollectionRow
                  key={collection.id}
                  collection={collection}
                  footnote={formatUnseenFootnote(collection)}
                  paceLine={formatPaceLine(collection.paceInsight)}
                />
              ))}
            </div>
          ) : null}

          {stats.pausedCollections.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/50">
                Paused
              </p>
              <div className="divide-y divide-base-content/10">
                {stats.pausedCollections.map((collection) => (
                  <CollectionRow key={collection.id} collection={collection} muted />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
