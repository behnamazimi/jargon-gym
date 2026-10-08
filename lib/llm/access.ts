import type { SupabaseClient } from "@supabase/supabase-js";
import { getMyCreditState } from "@/lib/ai-credits/repository";
import type { CreditState, TopUpState } from "@/lib/ai-credits/types";
import type { Database } from "@/lib/supabase/database.types";
import { getCentralLlmConfig, type CentralLlmConfig } from "./central";
import {
  checkFeaturePolicy,
  getFeatureSettings,
  isOnFeatureAllowlist,
} from "@/lib/ai/feature-settings";
import type { BillableFeatureId } from "@/lib/ai/registry";
import { isSchemaMissing } from "@/lib/ai/schema-missing";
import { getUserIsAdmin } from "@/lib/auth/require-session";
import { LLM_PROVIDER_LABELS, type AiAccessView, type LlmProvider } from "./types";

type Client = SupabaseClient<Database>;

type CreditsOrNone =
  | { kind: "credits"; central: CentralLlmConfig; state: CreditState }
  | { kind: "unavailable"; reason: "none" | "exhausted"; topUp?: TopUpState };

/** The app's key, paid with credits. Off when the key isn't set up,
 *  the switch is off, or the balance is empty. */
async function resolveCredits(client: Client): Promise<CreditsOrNone> {
  const central = getCentralLlmConfig();
  if (!central) return { kind: "unavailable", reason: "none" };

  const state = await getMyCreditState(client);
  if (!state || !state.enabled) return { kind: "unavailable", reason: "none" };
  if (state.remaining <= 0) {
    return { kind: "unavailable", reason: "exhausted", topUp: state.topUp };
  }

  return { kind: "credits", central, state };
}

/** Who pays for this user's AI, for showing on screen. Never holds a key. */
export async function getAiAccessView(client: Client): Promise<AiAccessView> {
  const credits = await resolveCredits(client).catch((error: unknown): CreditsOrNone => {
    console.error("Couldn't load AI credits:", error);
    return { kind: "unavailable", reason: "none" };
  });

  if (credits.kind === "unavailable") return credits;

  return {
    kind: "credits",
    providerLabel: LLM_PROVIDER_LABELS[credits.central.provider],
    remaining: credits.state.remaining,
    total: credits.state.total,
    costs: credits.state.costs,
    topUp: credits.state.topUp,
  };
}

export type AiAccess =
  | {
      kind: "credits";
      provider: LlmProvider;
      apiKey: string;
      remaining: number;
      costs: CreditState["costs"];
    }
  | { kind: "unavailable"; reason: "none" | "exhausted" | "feature-off" };

/** The feature switch and who may use it. If the database doesn't have the
 *  settings table yet, the request goes through, so an app deployed ahead of
 *  its migration keeps working. Any other read error fails the request, and a
 *  missing row means the feature is off. */
async function featureAllowed(
  client: Client,
  admin: Client,
  userId: string,
  feature: BillableFeatureId,
): Promise<boolean> {
  let settings;
  try {
    settings = await getFeatureSettings(client, feature);
  } catch (error) {
    if (!isSchemaMissing(error)) throw error;
    console.error("The AI feature settings aren't in the database yet:", error);
    return true;
  }
  if (!settings) return false;
  if (settings.enabled && settings.accessMode === "everyone") return true;

  const isAdmin = await getUserIsAdmin(userId);
  const onAllowlist =
    settings.accessMode === "allowlist" && !isAdmin
      ? await isOnFeatureAllowlist(admin, feature, userId)
      : false;
  return checkFeaturePolicy(settings, { isAdmin, onAllowlist }).usable;
}

/** The key to generate with. The feature switch comes first and blocks
 *  everyone, then the app's key is used if the user has credits. */
export async function resolveAiAccess(
  client: Client,
  admin: Client,
  userId: string,
  feature: BillableFeatureId,
): Promise<AiAccess> {
  if (!(await featureAllowed(client, admin, userId, feature))) {
    return { kind: "unavailable", reason: "feature-off" };
  }

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
