import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { QuizPanel, QuizPanelBody, QuizPanelHeader } from "@/components/jargon/quiz/quiz-ui";

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
      <QuizPanelHeader icon={BookOpen} title={title} description={description} />
      {actions ? <QuizPanelBody>{actions}</QuizPanelBody> : null}
    </QuizPanel>
  );
}
