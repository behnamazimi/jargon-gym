import type { ReactNode } from "react";
import { GoalCaughtUp } from "@/components/goals/goal-caught-up";
import { CaughtUpScene } from "@/components/illustrations/scenes/caught-up";
import { QuizCenteredState, QuizPanel, QuizPanelBody } from "@/components/quiz/quiz-ui";
import type { GoalTier } from "@/lib/goals/levels";

/** Shared "nothing left to read" empty state for both the paged Read view
 *  and the fullscreen feed, so the two never visually drift apart. */
export function ReadCaughtUp({
  title = "No terms to read",
  description,
  actions,
  goal,
}: {
  /** Counts toward a daily goal: running out of terms meets it. */
  goal?: { tier: GoalTier; collectionId: string };
  title?: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <QuizPanel>
      {goal ? <GoalCaughtUp tier={goal.tier} collectionId={goal.collectionId} /> : null}
      <QuizPanelBody>
        <QuizCenteredState
          illustration={<CaughtUpScene className="w-48 sm:w-56" />}
          title={title}
          description={description}
        >
          {actions}
        </QuizCenteredState>
      </QuizPanelBody>
    </QuizPanel>
  );
}
