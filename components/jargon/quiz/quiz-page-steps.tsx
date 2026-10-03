"use client";

import { AlertCircle } from "lucide-react";
import { PreparingScene } from "@/components/illustrations/scenes/preparing";
import { CreditsInsteadButton } from "@/components/jargon/ai-credits/credits-instead-button";
import { QuizQuestionView } from "@/components/jargon/quiz/quiz-question";
import {
  QuizCenteredState,
  QuizPanel,
  QuizPanelBody,
  QuizPanelHeader,
} from "@/components/jargon/quiz/quiz-ui";
import { QuizPickerStep } from "@/components/jargon/quiz/quiz-picker-step";
import { StudyProgress } from "@/components/jargon/study/study-progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import type { AiAccessView } from "@/lib/llm/types";
import { type PausedStudyCollection, type StudyCollection } from "@/lib/study/types";
import { type useQuizSession } from "@/components/jargon/quiz/use-quiz-session";

export type UseQuizSessionResult = ReturnType<typeof useQuizSession>;

export function QuizGeneratingStep({ quiz }: { quiz: UseQuizSessionResult }) {
  const isSimple = quiz.questionStyle === "simple";
  return (
    <QuizPanel className="flex min-h-0 flex-1 flex-col">
      <QuizPanelBody className="flex min-h-0 flex-1 items-center justify-center">
        <QuizCenteredState
          illustration={<PreparingScene className="w-48" />}
          title={isSimple ? "Preparing your quiz" : "Building your quiz"}
          description={
            isSimple
              ? `Setting up ${quiz.questionCount} question${quiz.questionCount === 1 ? "" : "s"}…`
              : `Writing ${quiz.questionCount} question${quiz.questionCount === 1 ? "" : "s"}… This usually takes a few seconds.`
          }
        />
      </QuizPanelBody>
    </QuizPanel>
  );
}

function QuizActiveQuestionStep({ quiz }: { quiz: UseQuizSessionResult }) {
  const question = quiz.questions[quiz.currentIndex];
  if (!question) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <StudyProgress
        className="shrink-0"
        current={quiz.currentIndex + 1}
        total={quiz.questions.length}
        unitLabel={quiz.practice ? "Practice" : "Question"}
      />
      {quiz.practice ? (
        <p className="m-0 shrink-0 text-xs text-base-content/70">
          Practice round: answers aren&apos;t counted toward mastery.
        </p>
      ) : null}
      {quiz.errorMessage ? (
        <Alert variant="destructive" className="shrink-0">
          <AlertDescription>{quiz.errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      <QuizQuestionView
        key={`${question.termId}-${quiz.currentIndex}`}
        question={question}
        termLabel={quiz.termById.get(question.termId)?.term ?? "Term"}
        correct={quiz.correctSoFar}
        isLast={quiz.currentIndex + 1 === quiz.questions.length}
        onAnswer={quiz.handleQuestionAnswer}
      />
    </div>
  );
}

export function QuizPlayingStep({ quiz }: { quiz: UseQuizSessionResult }) {
  return <QuizActiveQuestionStep quiz={quiz} />;
}

export function QuizPickerStepSection({
  quiz,
  ai,
  aiFellBack,
  canUseAi,
  collections,
  paused,
  aiRequiresSetup,
}: {
  quiz: UseQuizSessionResult;
  ai: AiAccessView;
  aiFellBack: boolean;
  canUseAi: boolean;
  collections: StudyCollection[];
  paused: PausedStudyCollection[];
  aiRequiresSetup: boolean;
}) {
  return (
    <QuizPickerStep
      collections={collections}
      paused={paused}
      ai={ai}
      aiFellBack={aiFellBack}
      savedSession={quiz.savedSession}
      onResumeSession={quiz.handleResumeSession}
      questionStyle={quiz.questionStyle}
      onQuestionStyleChange={(style) => {
        quiz.setQuestionStyle(style);
        quiz.setErrorMessage(null);
      }}
      aiRequiresSetup={aiRequiresSetup}
      errorMessage={quiz.errorMessage}
      selectedCollectionId={quiz.selectedCollectionId}
      onSelectedCollectionIdChange={quiz.setSelectedCollectionId}
      availableTermCount={quiz.availableTermCount}
      questionCount={quiz.questionCount}
      questionCountInput={quiz.questionCountInput}
      questionCountError={quiz.questionCountError}
      questionCountPresets={quiz.questionCountPresets}
      onApplyQuestionCount={quiz.applyQuestionCount}
      onQuestionCountInputChange={quiz.handleQuestionCountInputChange}
      onStartQuiz={() => {
        quiz.saveSetup();
        void quiz.handleStartQuiz(canUseAi);
      }}
    />
  );
}

export function QuizErrorStep({ quiz, ai }: { quiz: UseQuizSessionResult; ai: AiAccessView }) {
  return (
    <QuizPanel className="flex min-h-0 flex-1 flex-col">
      <QuizPanelHeader
        icon={AlertCircle}
        title="Quiz didn't finish"
        description="Something interrupted the quiz."
      />
      <QuizPanelBody className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            {quiz.errorMessage ?? "Couldn't complete the quiz. Try again."}
          </AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            onPress={quiz.resetQuizState}
            className="min-h-11"
          >
            Try again
          </Button>
          <CreditsInsteadButton
            ai={ai}
            reason={quiz.errorReason}
            onSwitched={quiz.resetQuizState}
            onError={quiz.setErrorMessage}
          />
          {quiz.errorReason === "unavailable" ||
          quiz.errorReason === "busy" ||
          quiz.errorReason === "feature-off" ? null : (
            <LinkButton href="/jargon/settings?tab=ai" variant="ghost" className="min-h-11">
              {quiz.errorReason === "credits" ? "Add your own key" : "Check settings"}
            </LinkButton>
          )}
        </div>
      </QuizPanelBody>
    </QuizPanel>
  );
}
