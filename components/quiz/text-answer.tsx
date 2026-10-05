import { Input } from "@/components/ui/input";
import { gradeAnswer } from "@/lib/quiz/grade";
import type { QuizResponse, QuizTextQuestion } from "@/lib/quiz/types";
import { cn } from "@/lib/utils";

type TextAnswerProps = {
  question: QuizTextQuestion;
  response: QuizResponse | null;
  submitted: boolean;
  onRespond: (response: QuizResponse) => void;
};

/** Focusing from script on a touch screen opens the keyboard before the browser
 *  applies autocapitalize (iOS starts shifted) and hides the question, so only
 *  mouse and keyboard users get autofocus. */
function hasFinePointer(): boolean {
  return window.matchMedia("(pointer: fine)").matches;
}

export function TextAnswer({ question, response, submitted, onRespond }: TextAnswerProps) {
  const text = response?.interaction === "text" ? response.text : "";
  const passed = submitted && response !== null && gradeAnswer(question, response);

  return (
    <Input
      aria-label="Your answer"
      value={text}
      onChange={(event) => onRespond({ interaction: "text", text: event.target.value })}
      readOnly={submitted}
      autoFocus={hasFinePointer()}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="none"
      spellCheck={false}
      lang={question.language}
      placeholder="Type your answer"
      className={cn("mt-5 text-base", submitted && (passed ? "input-success" : "input-error"))}
    />
  );
}
