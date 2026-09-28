import type { SupabaseClient } from "@supabase/supabase-js";
import { getMyCreditState } from "@/lib/ai-credits/repository";
import type { CreditState } from "@/lib/ai-credits/types";
import type { Database } from "@/lib/supabase/database.types";
import { getCentralLlmConfig, type CentralLlmConfig } from "./central";
import { getDecryptedApiKey, getUserSettings } from "./settings";
import {
  hasLlmConfigured,
  LLM_PROVIDER_LABELS,
  type AiAccessView,
  type LlmProvider,
} from "./types";

type Client = SupabaseClient<Database>;

type CreditsOrNone =
  | { kind: "credits"; central: CentralLlmConfig; state: CreditState }
  | { kind: "unavailable"; reason: "none" | "exhausted" };

/** The app's own key, for users without one. Off when the key isn't set up,
 *  the switch is off, or the balance is empty. */
async function resolveCredits(client: Client): Promise<CreditsOrNone> {
  const central = getCentralLlmConfig();
  if (!central) return { kind: "unavailable", reason: "none" };

  const state = await getMyCreditState(client);
  if (!state || !state.enabled) return { kind: "unavailable", reason: "none" };
  if (state.remaining <= 0) return { kind: "unavailable", reason: "exhausted" };

  return { kind: "credits", central, state };
}

/** Who pays for this user's AI, for showing on screen. Never holds a key. */
export async function getAiAccessView(client: Client, userId: string): Promise<AiAccessView> {
  const [settings, credits] = await Promise.all([
    getUserSettings(client, userId),
    resolveCredits(client),
  ]);

  if (settings?.provider && hasLlmConfigured(settings)) {
    return {
      kind: "own",
      providerLabel: LLM_PROVIDER_LABELS[settings.provider],
      creditsRemaining: credits.kind === "credits" ? credits.state.remaining : null,
    };
  }

  if (credits.kind === "unavailable") return credits;

  return {
    kind: "credits",
    providerLabel: LLM_PROVIDER_LABELS[credits.central.provider],
    remaining: credits.state.remaining,
    total: credits.state.total,
    costs: credits.state.costs,
  };
}

export type AiAccess =
  | { kind: "own"; provider: LlmProvider; apiKey: string }
  | {
      kind: "credits";
      provider: LlmProvider;
      apiKey: string;
      remaining: number;
      costs: CreditState["costs"];
    }
  | { kind: "unavailable"; reason: "none" | "exhausted" };

/** The key to generate with. A saved key of the user's own always wins. */
export async function resolveAiAccess(client: Client, userId: string): Promise<AiAccess> {
  const own = await getDecryptedApiKey(client, userId);
  if (own) return { kind: "own", ...own };

  const credits = await resolveCredits(client);
  if (credits.kind === "unavailable") return credits;

  return {
    kind: "credits",
    provider: credits.central.provider,
    apiKey: credits.central.apiKey,
    remaining: credits.state.remaining,
    costs: credits.state.costs,
  };
}
