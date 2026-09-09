import { Clock, Gauge, ListChecks } from "lucide-react";
import type { DebugScoredRow } from "@/app/(private)/jargon/debug/actions";
import { CollapsiblePanel } from "@/components/jargon/debug/collapsible-panel";
import { ScoreRows } from "@/components/jargon/debug/score-rows";
import {
  CollectionBreakdownTable,
  computeCollectionBreakdown,
  computeQueueStats,
  RetrievabilityDistributionBar,
  StatsStrip,
} from "@/components/jargon/debug/stats-strip";
import { QuizPanel, QuizPanelBody, QuizPanelHeader } from "@/components/jargon/quiz/quiz-ui";
import type { PickContext } from "@/lib/trace-queue";
import type { StudyCollection } from "@/lib/study/types";

type DebugQueueViewProps = {
  context: PickContext;
  domainId: string;
  collections: StudyCollection[];
  rows: DebugScoredRow[];
  coolingDown: DebugScoredRow[];
};

export function DebugQueueView({
  context,
  domainId,
  collections,
  rows,
  coolingDown,
}: DebugQueueViewProps) {
  return (
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
  );
}
