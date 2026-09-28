import { QuizPanelLabel, QuizStat } from "@/components/jargon/quiz/quiz-ui";
import {
  StudyCollectionField,
  StudyCountField,
  StudyResumeBanner,
  StudySetupPanel,
} from "@/components/jargon/study/study-setup-panel";
import { QuizQuestionStyleField } from "@/components/jargon/quiz/quiz-question-style-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  QuizPickerAiNotices,
  QuizPickerFooterHint,
  QuizPickerOverBalance,
  quizCreditUse,
} from "@/components/jargon/quiz/quiz-picker-notices";
import type { AiAccessView } from "@/lib/llm/types";
import { type PausedStudyCollection, type StudyCollection } from "@/lib/study/types";
import type { QuizQuestionStyle } from "@/lib/quiz/types";
import type { QuizSessionState } from "@/lib/quiz/session-storage";

export type QuizPickerStepProps = {
  collections: StudyCollection[];
  paused: PausedStudyCollection[];
  ai: AiAccessView;
  aiFellBack: boolean;
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

function QuizPickerResumeBanner({
  savedSession,
  onResumeSession,
  onDiscardSession,
}: {
  savedSession: QuizSessionState;
  onResumeSession: () => void;
  onDiscardSession: () => void;
}) {
  return (
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
  );
}

export function QuizPickerSetupPanel(props: QuizPickerStepProps) {
  const {
    collections,
    ai,
    aiFellBack,
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
  } = props;

  const use = quizCreditUse(questionStyle, ai, questionCount);
  const startDisabled =
    availableTermCount === 0 || questionCountError !== null || aiRequiresSetup || use.overBalance;

  return (
    <StudySetupPanel
      footer={
        <Button
          type="button"
          onPress={onStartQuiz}
          isDisabled={startDisabled}
          className="min-h-11 w-full"
        >
          Start quiz
        </Button>
      }
      footerHint={<QuizPickerFooterHint questionStyle={questionStyle} ai={ai} cost={use.cost} />}
    >
      <QuizPanelLabel
        title="Set up your quiz"
        description="Pick which collection to pull from — Quiz surfaces the terms most at risk of slipping first."
      />
      {savedSession ? (
        <QuizPickerResumeBanner
          savedSession={savedSession}
          onResumeSession={onResumeSession}
          onDiscardSession={onDiscardSession}
        />
      ) : null}

      <QuizQuestionStyleField value={questionStyle} onChange={onQuestionStyleChange} />

      <QuizPickerAiNotices
        ai={ai}
        aiFellBack={aiFellBack}
        aiRequiresSetup={aiRequiresSetup}
        questionStyle={questionStyle}
      />

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
          availableTermCount === 1 ? "1 term available" : `${availableTermCount} terms available`
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

      <QuizPickerOverBalance use={use} questionCount={questionCount} onFit={onApplyQuestionCount} />

      {availableTermCount === 0 ? (
        <Alert variant="destructive">
          <AlertDescription>No terms in this collection yet.</AlertDescription>
        </Alert>
      ) : null}
    </StudySetupPanel>
  );
}
