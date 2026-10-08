import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LlmProvider } from "./types";

const MODEL_BY_PROVIDER: Record<LlmProvider, string> = {
  google: "gemini-3.8-flash",
  anthropic: "claude-haiku-4-5",
};

export function modelName(provider: LlmProvider): string {
  return MODEL_BY_PROVIDER[provider];
}

// Lets tests point the SDKs at a local stub; unset in every real environment.
const baseURL = () => process.env.LLM_BASE_URL || undefined;

export function createModel(provider: LlmProvider, apiKey: string) {
  if (provider === "google") {
    const google = createGoogleGenerativeAI({ apiKey, baseURL: baseURL() });
    return google(MODEL_BY_PROVIDER.google);
  }

  const anthropic = createAnthropic({ apiKey, baseURL: baseURL() });
  return anthropic(MODEL_BY_PROVIDER.anthropic);
}
