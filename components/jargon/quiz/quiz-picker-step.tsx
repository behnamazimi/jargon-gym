import { AlertCircle } from "lucide-react";
import {
  QuizCenteredState,
  QuizPanel,
  QuizPanelBody,
  QuizPanelLabel,
  QuizStat,
} from "@/components/jargon/quiz/quiz-ui";
import {
  StudyCollectionField,
  StudyCountField,
  StudyNoActiveCollectionsState,
  StudyResumeBanner,
  StudySetupPanel,
} from "@/components/jargon/study/study-setup-panel";
import { QuizQuestionStyleField } from "@/components/jargon/quiz/quiz-question-style-field";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { type StudyCollection } from "@/lib/study/types";
import type { QuizQuestionStyle } from "@/lib/quiz/types";
import type { QuizSessionState } from "@/lib/quiz/session-storage";

type QuizPickerStepProps = {
  collections: StudyCollection[];
  providerLabel: string | null;
  savedSession: QuizSessionState | null;
  onResumeSession: () => void;
  onDiscardSession: () => void;
  questionStyle: QuizQuestionStyle;
  onQuestionStyleChange: (style: QuizQuestionStyle) => void;
  aiRequiresSetup: boolean;
  errorMessage: string | null;
  selectedCollectionId: string;
  onSelectedCollectionIdChange: (value: string) => void;
  availableTermCount: number;
  questionCount: number;
  questionCountInput: string;
  questionCountError: string | null;
  maxQuestionCount: number;
  questionCountPresets: number[];
  onApplyQuestionCount: (value: number) => void;
  onQuestionCountInputChange: (value: string) => void;
  onStartQuiz: () => void;
};

export function QuizPickerStep({
  collections,
  providerLabel,
  savedSession,
  onResumeSession,
  onDiscardSession,
  questionStyle,
  onQuestionStyleChange,
  aiRequiresSetup,
  errorMessage,
  selectedCollectionId,
  onSelectedCollectionIdChange,
  availableTermCount,
  questionCount,
  questionCountInput,
  questionCountError,
  maxQuestionCount,
  questionCountPresets,
  onApplyQuestionCount,
  onQuestionCountInputChange,
  onStartQuiz,
}: QuizPickerStepProps) {
  return (
    <QuizPanel className="flex max-h-full min-h-0 w-full flex-col">
      {collections.length === 0 ? (
        <StudyNoActiveCollectionsState description="Turn on a collection on the collection page before you take a quiz." />
      ) : availableTermCount === 0 && !savedSession ? (
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
      ) : (
        <StudySetupPanel
          footer={
            <Button
              type="button"
              onPress={onStartQuiz}
              isDisabled={
                availableTermCount === 0 || questionCountError !== null || aiRequiresSetup
              }
              className="min-h-11 w-full"
            >
              Start quiz
            </Button>
          }
          footerHint={
            questionStyle === "simple" ? (
              <>Uses terms from your collections — no AI needed.</>
            ) : (
              <>Uses {providerLabel ?? "your LLM provider"} — this may take a moment.</>
            )
          }
        >
          <QuizPanelLabel
            title="Set up your quiz"
            description="Pick which collection to pull from — Quiz surfaces the terms most at risk of slipping first."
          />
          {savedSession ? (
            <StudyResumeBanner
              message={
                <>
                  You have a quiz in progress — question{" "}
                  <span className="tabular-nums">{savedSession.currentIndex + 1}</span> of{" "}
                  <span className="tabular-nums">{savedSession.questions.length}</span>.
                </>
              }
              onResume={onResumeSession}
              onDiscard={onDiscardSession}
            />
          ) : null}

          <QuizQuestionStyleField value={questionStyle} onChange={onQuestionStyleChange} />

          {aiRequiresSetup ? (
            <Alert variant="destructive" className="max-w-md">
              <AlertDescription>
                AI quizzes need a provider and API key in Settings. Choose simple mode, or set up an
                LLM provider.
              </AlertDescription>
              <AlertAction>
                <LinkButton
                  href="/jargon/settings"
                  size="sm"
                  variant="outline"
                  className="max-md:min-h-11"
                >
                  Go to Settings
                </LinkButton>
              </AlertAction>
            </Alert>
          ) : null}

          {errorMessage ? (
            <Alert variant="destructive" className="max-w-md">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <StudyCollectionField
            id="quiz-collection"
            collections={collections}
            value={selectedCollectionId}
            onChange={onSelectedCollectionIdChange}
          />

          <QuizStat
            value={
              availableTermCount === 1
                ? "1 term available"
                : `${availableTermCount} terms available`
            }
          />

          <StudyCountField
            id="quiz-question-count"
            label="How many questions"
            presets={questionCountPresets}
            selectedValue={questionCount}
            inputValue={questionCountInput}
            error={questionCountError}
            max={maxQuestionCount}
            availableCount={availableTermCount}
            perUnitLabel="quiz"
            onPresetSelect={onApplyQuestionCount}
            onInputChange={onQuestionCountInputChange}
          />

          {availableTermCount === 0 ? (
            <Alert variant="destructive">
              <AlertDescription>No terms in this collection yet.</AlertDescription>
            </Alert>
          ) : null}
        </StudySetupPanel>
      )}
    </QuizPanel>
  );
}
