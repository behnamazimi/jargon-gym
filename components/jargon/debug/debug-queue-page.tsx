import { AlertCircle } from "lucide-react";
import type { CalibrationViewData, DebugScoredRow } from "@/app/(private)/jargon/debug/actions";
import { DebugCalibrationView } from "@/components/jargon/debug/debug-calibration-view";
import { DebugViewTabs } from "@/components/jargon/debug/debug-view-tabs";
import { QueueFilters } from "@/components/jargon/debug/debug-queue-filters";
import { DebugQueueView } from "@/components/jargon/debug/debug-queue-view";
import { QuizCenteredState, QuizPanel, QuizPanelBody } from "@/components/jargon/quiz/quiz-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PickContext } from "@/lib/trace-queue";
import type { StudyCollection } from "@/lib/study/types";

export { debugQueueHref, debugViewHref } from "@/components/jargon/debug/debug-queue-filters";

type DebugView = "queue" | "calibration";

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
        <DebugQueueView
          context={context}
          domainId={domainId}
          collections={collections}
          rows={rows}
          coolingDown={coolingDown}
        />
      ) : (
        <DebugCalibrationView data={calibration} />
      )}
    </>
  );
}
