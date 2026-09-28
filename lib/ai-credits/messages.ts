import type { AiFailureReason } from "@/lib/llm/types";

export const AI_TEMPORARILY_UNAVAILABLE = "AI is unavailable right now. Try again in a bit.";

type Failure = { error: string; reason: AiFailureReason };

/** No usable AI for this user: no key of their own, and no credits to fall back on. */
export function noAiFailure(reason: "none" | "exhausted", activity: string): Failure {
  if (reason === "exhausted") {
    return {
      error: `You've used your AI credits for now. Add your own key in Settings to ${activity}.`,
      reason: "credits",
    };
  }
  return {
    error: `Add a provider and API key in Settings to ${activity}.`,
    reason: "no-ai",
  };
}

/** The reservation was refused: too little balance for this request, or credits are switched off. */
export function creditsRefusedFailure(
  outcome: { reason: "insufficient" | "disabled"; remaining: number; cost: number },
  what: string,
): Failure {
  if (outcome.reason === "disabled") {
    return { error: AI_TEMPORARILY_UNAVAILABLE, reason: "unavailable" };
  }
  return {
    error: `This ${what} needs ${outcome.cost} credits and you have ${outcome.remaining}. Try a smaller one.`,
    reason: "credits",
  };
}
