import type { AiFailureReason } from "@/lib/llm/types";

export const AI_TEMPORARILY_UNAVAILABLE = "AI is unavailable right now. Try again in a moment.";

type Failure = { error: string; reason: AiFailureReason };

/** No usable AI for this user: no credits left, or the app's AI isn't set up. */
export function noAiFailure(
  reason: "none" | "exhausted" | "feature-off",
  activity: string,
): Failure {
  if (reason === "feature-off") {
    return { error: "This isn't available right now.", reason: "feature-off" };
  }
  if (reason === "exhausted") {
    return {
      error: `You've used your AI credits for now, so you can't ${activity}.`,
      reason: "credits",
    };
  }
  return {
    error: `AI isn't available right now, so you can't ${activity}.`,
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

/** Another request for the same thing is already running. */
export function busyFailure(): Failure {
  return {
    error: "You already have one running. Give it a minute and try again.",
    reason: "busy",
  };
}
