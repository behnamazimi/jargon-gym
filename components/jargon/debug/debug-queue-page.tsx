import { AlertCircle } from "lucide-react";
import type { CalibrationViewData, DebugScoredRow } from "@/app/(private)/jargon/debug/actions";
import { DebugCalibrationView } from "@/components/jargon/debug/debug-calibration-view";
import { DebugQueueView } from "@/components/jargon/debug/debug-queue-view";
import { QuizCenteredState, QuizPanel, QuizPanelBody } from "@/components/jargon/quiz/quiz-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PickContext } from "@/lib/trace-queue";
import type { StudyCollection } from "@/lib/study/types";

export { debugQueueHref, debugViewHref } from "@/components/jargon/debug/debug-queue-filters";

type DebugView = "queue" | "calibration";

export function DebugQueueEmpty() {
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

type DebugQueueContentProps = {
  collections: StudyCollection[];
  context: PickContext;
  domainId: string;
  view: DebugView;
  rows: DebugScoredRow[];
  coolingDown: DebugScoredRow[];
  calibration: CalibrationViewData | null;
  errorMessage: string | null;
};

export function DebugQueueContent({
  collections,
  context,
  domainId,
  view,
  rows,
  coolingDown,
  calibration,
  errorMessage,
}: DebugQueueContentProps) {
  if (errorMessage) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (view === "queue") {
    return (
      <DebugQueueView
        context={context}
        domainId={domainId}
        collections={collections}
        rows={rows}
        coolingDown={coolingDown}
      />
    );
  }

  return <DebugCalibrationView data={calibration} />;
}
