import { AI_TEMPORARILY_UNAVAILABLE } from "@/lib/ai-credits/messages";
import { isKeyRejected, isProviderKeyFault } from "@/lib/llm/errors";
import type { AiFailureReason } from "@/lib/llm/types";

type QuizFailure = { error: string; reason?: AiFailureReason };

/** Turns a failed AI quiz into what the user sees. Users on AI credits never see
 *  provider text, since the key isn't theirs. Only a rejected key offers to
 *  switch to credits, so a passing hiccup never puts a working key at risk. */
export function quizFailure(err: unknown, usingCredits: boolean): QuizFailure {
  if (usingCredits) {
    return {
      error: isProviderKeyFault(err)
        ? AI_TEMPORARILY_UNAVAILABLE
        : "Couldn't generate the quiz. Try again.",
      reason: "unavailable",
    };
  }

  return {
    error:
      err instanceof Error
        ? err.message
        : "Couldn't generate the quiz. Check your API key and try again.",
    reason: isKeyRejected(err) ? "own-key" : undefined,
  };
}
