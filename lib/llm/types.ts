import type { CreditCosts } from "@/lib/ai-credits/types";

export type LlmProvider = "google" | "anthropic";

export type UserSettings = {
  provider: LlmProvider | null;
  apiKeyLast4: string | null;
};

export const LLM_PROVIDER_LABELS: Record<LlmProvider, string> = {
  google: "Google",
  anthropic: "Anthropic",
};

export const LLM_PROVIDER_OPTIONS: { value: LlmProvider; label: string }[] = [
  { value: "google", label: "Google" },
  { value: "anthropic", label: "Anthropic" },
];

export function hasLlmConfigured(settings: UserSettings | null): boolean {
  return Boolean(settings?.provider && settings.apiKeyLast4);
}

/** What the UI needs to know about who pays for AI, with no secrets in it. */
export type AiAccessView =
  | { kind: "own"; providerLabel: string; creditsRemaining: number | null }
  | {
      kind: "credits";
      providerLabel: string;
      remaining: number;
      total: number;
      costs: CreditCosts;
    }
  | { kind: "unavailable"; reason: "none" | "exhausted" };

export type AiFailureReason = "no-ai" | "credits" | "unavailable" | "own-key";

export const AI_CREDITS_LOW_THRESHOLD = 10;

export function aiAvailable(view: AiAccessView): boolean {
  return view.kind !== "unavailable";
}
