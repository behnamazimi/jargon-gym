"use client";

import { QuizResults } from "@/components/jargon/quiz/quiz-results";
import {
  QuizErrorStep,
  QuizGeneratingStep,
  QuizPickerStepSection,
  QuizPlayingStep,
} from "@/components/jargon/quiz/quiz-page-steps";
import type { InitialQuizSetup } from "@/lib/quiz/setup-preference";
import { type PausedStudyCollection, type StudyCollection } from "@/lib/study/types";
import { useQuizSession } from "@/components/jargon/quiz/use-quiz-session";

type QuizPageProps = {
  llmConfigured: boolean;
  providerLabel: string | null;
  collections: StudyCollection[];
  paused: PausedStudyCollection[];
  initialSetup: InitialQuizSetup;
};

export function QuizPage({
  llmConfigured,
  providerLabel,
  collections,
  paused,
  initialSetup,
}: QuizPageProps) {
  const quiz = useQuizSession(collections, initialSetup);
  const aiRequiresSetup = quiz.questionStyle === "ai" && !llmConfigured;

  switch (quiz.step) {
    case "picker":
      return (
        <QuizPickerStepSection
          quiz={quiz}
          llmConfigured={llmConfigured}
          providerLabel={providerLabel}
          collections={collections}
          paused={paused}
          aiRequiresSetup={aiRequiresSetup}
        />
      );
    case "generating":
      return <QuizGeneratingStep quiz={quiz} />;
    case "playing":
      return <QuizPlayingStep quiz={quiz} />;
    case "results":
      return (
        <QuizResults
          score={quiz.score}
          total={quiz.resultsTotal}
          onQuizAgain={quiz.resetQuizState}
        />
      );
    case "error":
      return <QuizErrorStep quiz={quiz} />;
    default:
      return null;
  }
}
