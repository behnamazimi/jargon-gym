export type LlmProvider = "google" | "anthropic";

export type UserSettings = {
  provider: LlmProvider;
  apiKeyLast4: string;
  markUnknownOnFail: boolean;
  markKnownOnPass: boolean;
};

export const LLM_PROVIDER_LABELS: Record<LlmProvider, string> = {
  google: "Google",
  anthropic: "Anthropic",
};

export const LLM_PROVIDER_OPTIONS: { value: LlmProvider; label: string }[] = [
  { value: "google", label: "Google" },
  { value: "anthropic", label: "Anthropic" },
];
