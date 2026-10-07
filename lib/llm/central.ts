import type { AiCreditsMenuMode } from "@/lib/ai-credits/menu-line";
import type { LlmProvider } from "./types";

export type CentralLlmConfig = { provider: LlmProvider; apiKey: string };

let warnedAboutProvider = false;

/** The app's own AI key, or null when it isn't set up. Read at request time,
 *  so builds without the env vars keep working. */
export function getCentralLlmConfig(): CentralLlmConfig | null {
  const apiKey = process.env.CENTRAL_LLM_API_KEY?.trim();
  if (!apiKey) return null;

  const provider = process.env.CENTRAL_LLM_PROVIDER?.trim().toLowerCase() || "google";
  if (provider !== "google" && provider !== "anthropic") {
    if (!warnedAboutProvider) {
      warnedAboutProvider = true;
      console.error(`CENTRAL_LLM_PROVIDER must be "google" or "anthropic", got "${provider}".`);
    }
    return null;
  }

  return { provider, apiKey };
}

/** Whether the account menus should mention AI credits at all. */
export function aiCreditsMenuMode(): AiCreditsMenuMode {
  return getCentralLlmConfig() ? "credits" : "hidden";
}
