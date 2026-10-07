import { AI_TEMPORARILY_UNAVAILABLE } from "@/lib/ai-credits/messages";
import { isProviderKeyFault } from "@/lib/llm/errors";
import type { AiFailureReason } from "@/lib/llm/types";

type QuizFailure = { error: string; reason?: AiFailureReason };

/** Turns a failed AI quiz into what the user sees. Nobody sees provider or
 *  database text, since the key isn't theirs. */
export function quizFailure(err: unknown): QuizFailure {
  return {
    error: isProviderKeyFault(err)
      ? AI_TEMPORARILY_UNAVAILABLE
      : "Couldn't generate the quiz. Try again.",
    reason: "unavailable",
  };
}
