"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { QuizQuestionView } from "@/components/jargon/quiz/quiz-question";
import { QuizResults } from "@/components/jargon/quiz/quiz-results";
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
import { type StudyCollection } from "@/lib/study/types";
import { useQuizSession } from "@/components/jargon/quiz/use-quiz-session";

type QuizPageProps = {
  llmConfigured: boolean;
  providerLabel: string | null;
  collections: StudyCollection[];
  initialDomainId?: string;
};

export function QuizPage({
  llmConfigured,
  providerLabel,
  collections,
  initialDomainId,
}: QuizPageProps) {
  const quiz = useQuizSession(collections, initialDomainId);
  const aiRequiresSetup = quiz.questionStyle === "ai" && !llmConfigured;

  return (
    <>
      {quiz.step === "picker" ? (
        <QuizPickerStep
          collections={collections}
          providerLabel={providerLabel}
          savedSession={quiz.savedSession}
          onResumeSession={quiz.handleResumeSession}
          onDiscardSession={quiz.handleDiscardSession}
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
          maxQuestionCount={quiz.maxQuestionCount}
          questionCountPresets={quiz.questionCountPresets}
          onApplyQuestionCount={quiz.applyQuestionCount}
          onQuestionCountInputChange={quiz.handleQuestionCountInputChange}
          onStartQuiz={() => void quiz.handleStartQuiz(llmConfigured)}
        />
      ) : null}

      {quiz.step === "generating" ? (
        <QuizPanel className="flex min-h-0 flex-1 flex-col">
          <QuizPanelBody className="flex min-h-0 flex-1 items-center justify-center">
            <QuizCenteredState
              icon={Loader2}
              iconClassName="animate-spin"
              title={quiz.questionStyle === "simple" ? "Preparing your quiz" : "Building your quiz"}
              description={
                quiz.questionStyle === "simple"
                  ? `Setting up ${quiz.questionCount} question${quiz.questionCount === 1 ? "" : "s"}…`
                  : `Writing ${quiz.questionCount} question${quiz.questionCount === 1 ? "" : "s"}… This usually takes a few seconds.`
              }
            />
          </QuizPanelBody>
        </QuizPanel>
      ) : null}

      {quiz.step === "playing" && quiz.pendingFinalAnswers ? (
        <QuizPanel className="flex min-h-0 flex-1 flex-col">
          <QuizPanelHeader
            icon={AlertCircle}
            title="Couldn't save your results"
            description="Your last answer was recorded. Retry saving the results, or start over."
          />
          <QuizPanelBody className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {quiz.errorMessage ?? "Couldn't save the quiz results. Try again."}
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                onPress={() => void quiz.handleRetrySubmit()}
                isDisabled={quiz.isSubmittingAnswer}
                className="min-h-11"
              >
                Retry
              </Button>
              <Button
                type="button"
                variant="outline"
                onPress={quiz.resetQuizState}
                className="min-h-11"
              >
                Start over
              </Button>
            </div>
          </QuizPanelBody>
        </QuizPanel>
      ) : null}

      {quiz.step === "playing" && !quiz.pendingFinalAnswers && quiz.questions[quiz.currentIndex] ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <StudyProgress
            className="shrink-0"
            current={quiz.currentIndex + 1}
            total={quiz.questions.length}
            unitLabel="Question"
          />
          {quiz.errorMessage ? (
            <Alert variant="destructive" className="shrink-0">
              <AlertDescription>{quiz.errorMessage}</AlertDescription>
            </Alert>
          ) : null}
          <QuizQuestionView
            key={`${quiz.questions[quiz.currentIndex].termId}-${quiz.currentIndex}`}
            question={quiz.questions[quiz.currentIndex]}
            termLabel={quiz.termById.get(quiz.questions[quiz.currentIndex].termId)?.term ?? "Term"}
            current={quiz.currentIndex + 1}
            total={quiz.questions.length}
            correct={quiz.correctSoFar}
            isLast={quiz.currentIndex + 1 === quiz.questions.length}
            onAnswer={(passed) => void quiz.handleQuestionAnswer(passed)}
            isSubmitting={quiz.isSubmittingAnswer}
          />
        </div>
      ) : null}

      {quiz.step === "results" ? (
        <QuizResults
          score={quiz.score}
          total={quiz.resultsTotal}
          onQuizAgain={quiz.resetQuizState}
        />
      ) : null}

      {quiz.step === "error" ? (
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
              <LinkButton href="/jargon/settings" variant="ghost" className="min-h-11">
                Check settings
              </LinkButton>
            </div>
          </QuizPanelBody>
        </QuizPanel>
      ) : null}
    </>
  );
}
