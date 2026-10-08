import type { CreditCosts, TopUpState } from "@/lib/ai-credits/types";

export type LlmProvider = "google" | "anthropic";

export const LLM_PROVIDER_LABELS: Record<LlmProvider, string> = {
  google: "Google",
  anthropic: "Anthropic",
};

/** What the UI needs to know about who pays for AI, with no secrets in it. */
export type AiAccessView =
  | {
      kind: "credits";
      providerLabel: string;
      remaining: number;
      total: number;
      costs: CreditCosts;
      topUp: TopUpState;
    }
  | { kind: "unavailable"; reason: "none" | "exhausted"; topUp?: TopUpState };

type CreditsView = Extract<AiAccessView, { kind: "credits" }>;

/** What one request would spend, when it runs on AI credits. */
export type CreditUse = {
  credits: CreditsView | null;
  cost: number;
  overBalance: boolean;
};

export type AiFailureReason = "no-ai" | "credits" | "unavailable" | "busy" | "feature-off";

export const AI_CREDITS_LOW_THRESHOLD = 10;

export function aiAvailable(view: AiAccessView): boolean {
  return view.kind !== "unavailable";
}
