import Link from "next/link";
import { AlertCircle, Clock, Gauge, ListChecks } from "lucide-react";
import type { CalibrationViewData, DebugScoredRow } from "@/app/(private)/jargon/debug/actions";
import { CollapsiblePanel } from "@/components/jargon/debug/collapsible-panel";
import { DebugCalibrationView } from "@/components/jargon/debug/debug-calibration-view";
import { DebugCollectionSelect } from "@/components/jargon/debug/debug-collection-select";
import { DebugViewTabs } from "@/components/jargon/debug/debug-view-tabs";
import { ScoreRows } from "@/components/jargon/debug/score-rows";
import {
  CollectionBreakdownTable,
  computeCollectionBreakdown,
  computeQueueStats,
  RetrievabilityDistributionBar,
  StatsStrip,
} from "@/components/jargon/debug/stats-strip";
import {
  QuizCenteredState,
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
} from "@/components/jargon/quiz/quiz-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PickContext } from "@/lib/trace-queue";
import type { StudyCollection } from "@/lib/study/types";
import { cn } from "@/lib/utils";

export type DebugView = "queue" | "calibration";

type DebugQueuePageProps = {
  collections: StudyCollection[];
  context: PickContext;
  domainId: string;
  view: DebugView;
  rows: DebugScoredRow[];
  coolingDown: DebugScoredRow[];
  calibration: CalibrationViewData | null;
  errorMessage: string | null;
};

const CONTEXT_OPTIONS: Array<{
  value: PickContext;
  title: string;
  description: string;
}> = [
  {
    value: "read",
    title: "Read",
    description: "Read page/command priority — ranked by lowest exposure count first.",
  },
  {
    value: "review",
    title: "Review",
    description: "Flashcard review priority — ranked by recall retrievability R_r(t) ascending.",
  },
  {
    value: "quiz",
    title: "Quiz",
    description: "Quiz priority — ranked by recognition retrievability R_g(t) ascending.",
  },
];

export function debugQueueHref({ context, domainId }: { context: PickContext; domainId: string }) {
  const params = new URLSearchParams();
  if (context !== "review") params.set("context", context);
  if (domainId !== "all") params.set("domain", domainId);
  const query = params.toString();
  return query ? `/jargon/debug?${query}` : "/jargon/debug";
}

export function debugViewHref({
  view,
  context,
  domainId,
}: {
  view: DebugView;
  context: PickContext;
  domainId: string;
}) {
  const params = new URLSearchParams();
  if (view !== "queue") params.set("view", view);
  if (context !== "review") params.set("context", context);
  if (domainId !== "all") params.set("domain", domainId);
  const query = params.toString();
  return query ? `/jargon/debug?${query}` : "/jargon/debug";
}

/** Compact toolbar: which tier ranks these terms (Read/Review/Quiz, as a
 *  segmented control) and which collection to scope to, side by side —
 *  replaces the old stacked full-height radio list, which spent three rows
 *  of always-visible description text to show one active selection. Only
 *  the selected tier's ranking rule is shown, as a single caption line. */
function QueueFilters({
  context,
  domainId,
  collections,
}: {
  context: PickContext;
  domainId: string;
  collections: StudyCollection[];
}) {
  const selected =
    CONTEXT_OPTIONS.find((option) => option.value === context) ?? CONTEXT_OPTIONS[1]!;

  return (
    <QuizPanel>
      <QuizPanelBody className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" className="tabs tabs-box tabs-sm w-full sm:w-auto">
            {CONTEXT_OPTIONS.map((option) => (
              <Link
                key={option.value}
                href={debugQueueHref({ context: option.value, domainId })}
                scroll={false}
                role="tab"
                aria-selected={context === option.value}
                className={cn(
                  "tab grow no-underline sm:grow-0",
                  context === option.value && "tab-active",
                )}
              >
                {option.title}
              </Link>
            ))}
          </div>
          <div className="w-full sm:w-64">
            <DebugCollectionSelect
              collections={collections}
              domainId={domainId}
              context={context}
            />
          </div>
        </div>
        <p className="m-0 text-xs text-base-content/50">{selected.description}</p>
      </QuizPanelBody>
    </QuizPanel>
  );
}

export function DebugQueuePage({
  collections,
  context,
  domainId,
  view,
  rows,
  coolingDown,
  calibration,
  errorMessage,
}: DebugQueuePageProps) {
  if (collections.length === 0) {
    return (
      <QuizPanel>
        <QuizPanelBody>
          <QuizCenteredState
            icon={AlertCircle}
            title="No active collections"
            description="Turn on a collection on the collection page to see its terms here."
          />
        </QuizPanelBody>
      </QuizPanel>
    );
  }

  return (
    <>
      <DebugViewTabs view={view} context={context} domainId={domainId} />

      {view === "queue" ? (
        <QueueFilters context={context} domainId={domainId} collections={collections} />
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : view === "queue" ? (
        <>
          {rows.length > 0 ? (
            <QuizPanel>
              <QuizPanelHeader
                icon={Gauge}
                title="Pool overview"
                description="How every term in this collection is doing right now, and how many need a second look."
              />
              <QuizPanelBody>
                <StatsStrip stats={computeQueueStats(rows, context)} context={context} />
                <RetrievabilityDistributionBar rows={rows} />
                {domainId === "all" && collections.length > 1 ? (
                  <CollectionBreakdownTable stats={computeCollectionBreakdown(rows, collections)} />
                ) : null}
              </QuizPanelBody>
            </QuizPanel>
          ) : null}

          <QuizPanel>
            <QuizPanelHeader
              icon={ListChecks}
              title="Terms"
              description="Same order this tier would serve them next. Click a row for its full history — ⚠ flags a term whose recent results don't match its current prediction."
            />
            <QuizPanelBody>
              <ScoreRows rows={rows} />
            </QuizPanelBody>
          </QuizPanel>

          {context !== "read" && coolingDown.length > 0 ? (
            <QuizPanel>
              <CollapsiblePanel
                icon={<Clock className="size-5" aria-hidden strokeWidth={1.5} />}
                title={`Cooling down (${coolingDown.length})`}
                description="Just graded — temporarily out of the ranked queue until retrievability decays back down."
              >
                <ScoreRows rows={coolingDown} />
              </CollapsiblePanel>
            </QuizPanel>
          ) : null}
        </>
      ) : (
        <DebugCalibrationView data={calibration} />
      )}
    </>
  );
}
