import type { ReactNode } from "react";
import { CaughtUpScene } from "@/components/illustrations/scenes/caught-up";
import { QuizCenteredState, QuizPanel, QuizPanelBody } from "@/components/jargon/quiz/quiz-ui";

/** Shared "nothing left to read" empty state for both the paged Read view
 *  and the fullscreen feed, so the two never visually drift apart. */
export function ReadCaughtUp({
  title = "No terms to read",
  description,
  actions,
}: {
  title?: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <QuizPanel>
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
