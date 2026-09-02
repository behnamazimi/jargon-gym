import Link from "next/link";
import { AlertCircle, Info } from "lucide-react";
import type { CalibrationViewData, DebugScoredRow } from "@/app/(private)/jargon/debug/actions";
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
import { QuizCenteredState, QuizPanel, QuizPanelBody } from "@/components/jargon/quiz/quiz-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

const VIEW_HINT: Record<DebugView, string> = {
  queue:
    "Ranks every term for the selected tier and collection, same order it'd be shown in the app. Click a row to expand its full review_events history — every read, reveal, and grade with the numbers behind it. A ⚠ badge means the term's recent actual pass/fail results don't match what its current stability/posterior predicts.",
  calibration:
    "Checks whether predicted retrievability actually matches outcomes, using your own review history — not an aggregate across users. Each bucket compares its predicted range against the real pass rate; buckets under 5 samples show “not enough data” instead of a misleading percentage. Abandoned reveals are terms revealed but never graded within 10 minutes.",
};

function DebugHint({ view }: { view: DebugView }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-base-200/60 px-3 py-2.5 text-xs leading-relaxed text-base-content/60">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden strokeWidth={1.5} />
      <p className="m-0">{VIEW_HINT[view]}</p>
    </div>
  );
}

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

function DebugFilterLink({
  href,
  selected,
  title,
  description,
}: {
  href: string;
  selected: boolean;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 py-1 no-underline"
      aria-current={selected ? "true" : undefined}
    >
      <span
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
          selected ? "border-primary" : "border-base-content/40",
        )}
        aria-hidden
      >
        {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-none font-medium">{title}</span>
        <span className="mt-1.5 block text-xs leading-relaxed text-base-content/60">
          {description}
        </span>
      </span>
    </Link>
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
      <DebugHint view={view} />

      {view === "queue" ? (
        <QuizPanel>
          <QuizPanelBody>
            <fieldset className="flex max-w-md flex-col gap-2 border-0 p-0">
              <legend className="mb-2 text-sm leading-none font-medium">Context</legend>
              <div className="flex flex-col gap-3">
                {CONTEXT_OPTIONS.map((option) => (
                  <DebugFilterLink
                    key={option.value}
                    href={debugQueueHref({ context: option.value, domainId })}
                    selected={context === option.value}
                    title={option.title}
                    description={option.description}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset className="flex max-w-md flex-col gap-2 border-0 p-0">
              <legend className="mb-2 text-sm leading-none font-medium">Collection</legend>
              <DebugCollectionSelect
                collections={collections}
                domainId={domainId}
                context={context}
              />
            </fieldset>
          </QuizPanelBody>
        </QuizPanel>
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : view === "queue" ? (
        <>
          {rows.length > 0 ? (
            <QuizPanel>
              <QuizPanelBody>
                <StatsStrip stats={computeQueueStats(rows, context)} context={context} />
                <RetrievabilityDistributionBar rows={rows} />
                {domainId === "all" && collections.length > 1 ? (
                  <CollectionBreakdownTable stats={computeCollectionBreakdown(rows, collections)} />
                ) : null}
              </QuizPanelBody>
            </QuizPanel>
          ) : null}
          <ScoreRows rows={rows} />
          {context !== "read" && coolingDown.length > 0 ? (
            <Collapsible>
              <CollapsibleTrigger className="btn btn-ghost btn-sm">
                Cooling down ({coolingDown.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3">
                  <ScoreRows rows={coolingDown} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </>
      ) : (
        <DebugCalibrationView data={calibration} />
      )}
    </>
  );
}
