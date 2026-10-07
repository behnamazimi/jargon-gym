import { AI_TEMPORARILY_UNAVAILABLE } from "@/lib/ai-credits/messages";
import type { AiFailureReason } from "@/lib/llm/types";
import { StoryProviderError } from "./generate";

type StoryFailure = { error: string; reason?: AiFailureReason };

/** Turns a failed generation into what the user sees. Nobody sees provider or
 *  key details, since the key isn't theirs. */
export function storyFailure(err: unknown): StoryFailure {
  if (err instanceof StoryProviderError) {
    const keyFault = err.kind === "auth" || err.kind === "rate-limit";
    return { error: keyFault ? AI_TEMPORARILY_UNAVAILABLE : err.message, reason: "unavailable" };
  }
  console.error("generateStoryAction failed:", err);
  return { error: "Couldn't write a story this time. Try again.", reason: "unavailable" };
}
