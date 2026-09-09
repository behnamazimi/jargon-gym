import { AlertCircle } from "lucide-react";
import { QuizCenteredState, QuizPanel, QuizPanelBody } from "@/components/jargon/quiz/quiz-ui";
import { StudyNoActiveCollectionsState } from "@/components/jargon/study/study-setup-panel";
import { LinkButton } from "@/components/ui/button";
import {
  QuizPickerSetupPanel,
  type QuizPickerStepProps,
} from "@/components/jargon/quiz/quiz-picker-setup-panel";

function QuizPickerNoTerms() {
  return (
    <QuizPanelBody>
      <QuizCenteredState
        icon={AlertCircle}
        title="No terms yet"
        description="Add some terms to a collection, then come back to quiz yourself."
      >
        <LinkButton href="/jargon" variant="outline" className="min-h-11">
          Collections
        </LinkButton>
      </QuizCenteredState>
    </QuizPanelBody>
  );
}

export function QuizPickerStep(props: QuizPickerStepProps) {
  const { collections, savedSession, availableTermCount } = props;

  return (
    <QuizPanel className="flex max-h-full min-h-0 w-full flex-col">
      {collections.length === 0 ? (
        <StudyNoActiveCollectionsState description="Turn on a collection on the collection page before you take a quiz." />
      ) : availableTermCount === 0 && !savedSession ? (
        <QuizPickerNoTerms />
      ) : (
        <QuizPickerSetupPanel {...props} />
      )}
    </QuizPanel>
  );
}
