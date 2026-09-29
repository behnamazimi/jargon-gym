import { AI_TEMPORARILY_UNAVAILABLE } from "@/lib/ai-credits/messages";
import type { AiFailureReason } from "@/lib/llm/types";
import { StoryProviderError } from "./generate";

type StoryFailure = { error: string; reason?: AiFailureReason };

/** Turns a failed generation into what the user sees. Credits users never see
 *  provider, key or model details, since the key isn't theirs. */
export function storyFailure(err: unknown, usingCredits: boolean): StoryFailure {
  if (err instanceof StoryProviderError) {
    if (usingCredits) {
      const keyFault =
        err.kind === "auth" || err.kind === "rate-limit" || err.kind === "model-unavailable";
      return { error: keyFault ? AI_TEMPORARILY_UNAVAILABLE : err.message, reason: "unavailable" };
    }
    return { error: err.message, reason: err.kind === "auth" ? "own-key" : undefined };
  }
  console.error("generateStoryAction failed:", err);
  return {
    error: "Couldn't write a story this time. Try again.",
    reason: usingCredits ? "unavailable" : undefined,
  };
}
