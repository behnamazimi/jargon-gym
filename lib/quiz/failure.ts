import { AI_TEMPORARILY_UNAVAILABLE } from "@/lib/ai-credits/messages";
import { isProviderKeyFault } from "@/lib/llm/errors";
import type { AiFailureReason } from "@/lib/llm/types";

/** The model didn't answer in time; the charge is refunded and the user can retry. */
export class QuizTimeoutError extends Error {
  constructor(options?: ErrorOptions) {
    super("Writing the quiz took too long. Try again.", options);
  }
}

type QuizFailure = { error: string; reason?: AiFailureReason };

/** Turns a failed AI quiz into what the user sees. Nobody sees provider or
 *  database text, since the key isn't theirs. */
export function quizFailure(err: unknown): QuizFailure {
  if (err instanceof QuizTimeoutError) return { error: err.message, reason: "unavailable" };
  return {
    error: isProviderKeyFault(err)
      ? AI_TEMPORARILY_UNAVAILABLE
      : "Couldn't generate the quiz. Try again.",
    reason: "unavailable",
  };
}
