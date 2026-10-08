import type { SupabaseClient } from "@supabase/supabase-js";
import { modelName } from "@/lib/llm/model";
import type { LlmProvider } from "@/lib/llm/types";
import type { Database } from "@/lib/supabase/database.types";
import { tokenCostMicroUsd } from "./provider-cost";
import { recordCreditCost } from "./repository";
import type { UsageTally } from "./usage-tally";

/** Stores what a charged AI call cost. Does nothing when the provider
 *  reported no usage. Never throws. */
export async function recordModelCost(
  admin: SupabaseClient<Database>,
  ledgerId: number,
  provider: LlmProvider,
  tally: UsageTally,
): Promise<void> {
  const usage = tally.read();
  if (usage.calls === 0) return;
  await recordCreditCost(admin, ledgerId, {
    provider,
    model: modelName(provider),
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    reasoningTokens: usage.reasoningTokens,
    costMicroUsd: tokenCostMicroUsd(provider, usage),
    calls: usage.calls,
  });
}
