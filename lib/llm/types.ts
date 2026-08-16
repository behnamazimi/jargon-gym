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
