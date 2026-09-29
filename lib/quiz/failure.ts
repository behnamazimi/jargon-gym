import { AI_TEMPORARILY_UNAVAILABLE } from "@/lib/ai-credits/messages";
import { isKeyRejected, isProviderKeyFault } from "@/lib/llm/errors";
import type { AiFailureReason } from "@/lib/llm/types";

type QuizFailure = { error: string; reason?: AiFailureReason };

/** Turns a failed AI quiz into what the user sees. Nobody sees provider or
 *  database text. Only a rejected key offers to switch to credits, so a passing hiccup never puts a working key at risk. */
export function quizFailure(err: unknown, usingCredits: boolean): QuizFailure {
  if (usingCredits) {
    return {
      error: isProviderKeyFault(err)
        ? AI_TEMPORARILY_UNAVAILABLE
        : "Couldn't generate the quiz. Try again.",
      reason: "unavailable",
    };
  }

  if (isKeyRejected(err)) {
    return { error: "Your API key was rejected. Check it in Settings.", reason: "own-key" };
  }
  if (isProviderKeyFault(err)) {
    return { error: "Your AI provider reports no quota left or too many requests. Try later." };
  }
  return { error: "Couldn't generate the quiz. Try again." };
}
