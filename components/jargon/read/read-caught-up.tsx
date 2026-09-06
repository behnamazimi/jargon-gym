import { PartyPopper } from "lucide-react";
import type { ReactNode } from "react";
import { QuizPanel, QuizPanelBody, QuizPanelHeader } from "@/components/jargon/quiz/quiz-ui";

/** Shared "nothing left to read" empty state for both the paged Read view
 *  and the fullscreen feed, so the two never visually drift apart. */
export function ReadCaughtUp({
  description,
  actions,
}: {
  description: string;
  actions?: ReactNode;
}) {
  return (
    <QuizPanel>
      <QuizPanelHeader icon={PartyPopper} title="You're all caught up" description={description} />
      {actions ? <QuizPanelBody>{actions}</QuizPanelBody> : null}
    </QuizPanel>
  );
}
