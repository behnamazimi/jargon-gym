"use client";

import { QuizResults } from "@/components/quiz/quiz-results";
import {
  QuizErrorStep,
  QuizGeneratingStep,
  QuizPickerStepSection,
  QuizPlayingStep,
} from "@/components/quiz/quiz-page-steps";
import { aiAvailable, type AiAccessView } from "@/lib/llm/types";
import type { InitialQuizSetup } from "@/lib/quiz/setup-preference";
import { type PausedStudyCollection, type StudyCollection } from "@/lib/study/types";
import { useQuizSession } from "@/components/quiz/use-quiz-session";

type QuizPageProps = {
  ai: AiAccessView;
  collections: StudyCollection[];
  paused: PausedStudyCollection[];
  initialSetup: InitialQuizSetup;
};

export function QuizPage({ ai, collections, paused, initialSetup }: QuizPageProps) {
  const quiz = useQuizSession(collections, initialSetup);
  const canUseAi = aiAvailable(ai);
  const aiRequiresSetup = quiz.questionStyle === "ai" && !canUseAi;

  switch (quiz.step) {
    case "picker":
      return (
        <QuizPickerStepSection
          quiz={quiz}
          ai={ai}
          aiFellBack={initialSetup.aiFellBack}
          canUseAi={canUseAi}
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
          practice={quiz.practice}
          missedTerms={quiz.missedTerms}
          onQuizAgain={() =>
            aiRequiresSetup ? quiz.resetQuizState() : void quiz.handleStartQuiz(canUseAi)
          }
          onPractice={quiz.handleStartPractice}
          onChangeSetup={quiz.resetQuizState}
        />
      );
    case "error":
      return <QuizErrorStep quiz={quiz} ai={ai} />;
    default:
      return null;
  }
}
