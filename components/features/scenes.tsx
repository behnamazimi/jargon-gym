import type { ReactNode } from "react";
import { BringTermsInScene } from "@/components/illustrations/scenes/bring-terms-in";
import { NothingDueScene } from "@/components/illustrations/scenes/nothing-due";
import { PracticeBarsScene } from "@/components/illustrations/scenes/practice-bars";
import { ReadReviewQuizScene } from "@/components/illustrations/scenes/read-review-quiz";
import { ShadowingScene } from "@/components/illustrations/scenes/shadowing";
import { StoryScrollScene } from "@/components/illustrations/scenes/story-scroll";
import { TermLayersScene } from "@/components/illustrations/scenes/term-layers";
import type { FeatureSceneKey } from "@/lib/features/sections";

export const FEATURE_SCENES: Record<FeatureSceneKey, ReactNode> = {
  start: <BringTermsInScene />,
  study: <ReadReviewQuizScene />,
  learn: <TermLayersScene />,
  hear: <ShadowingScene />,
  stories: <StoryScrollScene />,
  noGuilt: <NothingDueScene />,
  progress: <PracticeBarsScene />,
};
