import type { ReactNode } from "react";
import { CollectionsIndexScene } from "@/components/illustrations/scenes/collections-index";
import { NoDueDatesScene } from "@/components/illustrations/scenes/no-due-dates";
import { PreparingScene } from "@/components/illustrations/scenes/preparing";
import { QuizCheerScene } from "@/components/illustrations/scenes/quiz-results";
import { ReadReviewQuizScene } from "@/components/illustrations/scenes/read-review-quiz";
import { TermAnatomyScene } from "@/components/illustrations/scenes/term-anatomy";
import type { FeatureSceneKey } from "@/lib/features/sections";

/** Stand-ins until each section gets its own scene. */
export const FEATURE_SCENES: Record<FeatureSceneKey, ReactNode> = {
  start: <CollectionsIndexScene />,
  learn: <TermAnatomyScene />,
  hear: <ReadReviewQuizScene />,
  stories: <PreparingScene />,
  noGuilt: <NoDueDatesScene />,
  progress: <QuizCheerScene />,
};
