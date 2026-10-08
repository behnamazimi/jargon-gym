import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CreditCosts, CreditFeature, CreditPrice, CreditState, TopUpState } from "./types";

type Client = SupabaseClient<Database>;

/** The price rows in effect now. A missing price is an error: charging at a
 *  guessed price is worse than not charging. */
async function getCreditCosts(client: Client): Promise<CreditCosts> {
  const { data, error } = await client
    .from("credit_prices")
    .select("feature, base_credits, credits_per_unit, unit_size, effective_from")
    .lte("effective_from", new Date().toISOString())
    .order("effective_from", { ascending: false });
  if (error) throw error;

  const price = (feature: CreditFeature): CreditPrice => {
    const row = data?.find((candidate) => candidate.feature === feature);
    if (!row) throw new Error("AI credit prices are not set.");
    return {
      baseCredits: Number(row.base_credits),
      creditsPerUnit: Number(row.credits_per_unit),
      unitSize: row.unit_size,
    };
  };
  return { quiz: price("quiz"), story: price("story"), narration_story: price("narration_story") };
}

export type ReserveResult =
  | { status: "ok"; remaining: number; ledgerId: number; credits: number }
  | { status: "insufficient" | "disabled"; remaining: number; credits: number };

async function getMyTopUpState(client: Client): Promise<TopUpState> {
  const { data, error } = await client.rpc("my_self_topup_state");
  if (error) throw error;

  const row = data?.[0];
  if (!row) return { available: false, reason: "off", amount: 0 };
  if (row.available) return { available: true, amount: row.amount };
  const reason = row.reason === "balance" || row.reason === "already-today" ? row.reason : "off";
  return { available: false, reason, amount: row.amount };
}

/** The signed-in user's balance. Pass the user-scoped client. */
export async function getMyCreditState(client: Client): Promise<CreditState | null> {
  const [{ data, error }, costs, topUp] = await Promise.all([
    client.rpc("my_ai_credit_state"),
    getCreditCosts(client),
    getMyTopUpState(client),
  ]);
  if (error) throw error;

  const row = data?.[0];
  if (!row) return null;

  return {
    enabled: row.enabled,
    total: row.total,
    remaining: row.remaining,
    costs,
    topUp,
  };
}

export async function reserveCredits(
  admin: Client,
  userId: string,
  feature: CreditFeature,
  units: number,
): Promise<ReserveResult> {
  const { data, error } = await admin.rpc("reserve_ai_credits", {
    p_user_id: userId,
    p_feature: feature,
    p_units: units,
  });
  if (error) throw error;

  const row = data?.[0];
  if (!row) throw new Error("Couldn't check AI credits.");
  if (row.status === "ok" && row.ledger_id !== null) {
    return {
      status: "ok",
      remaining: row.remaining,
      ledgerId: row.ledger_id,
      credits: row.credits,
    };
  }
  return {
    status: row.status === "disabled" ? "disabled" : "insufficient",
    remaining: row.remaining,
    credits: row.credits,
  };
}

export async function refundCredits(
  admin: Client,
  ledgerId: number,
  reason: string,
): Promise<void> {
  const { error } = await admin.rpc("refund_ai_credits", {
    p_ledger_id: ledgerId,
    p_reason: reason,
  });
  if (error) throw error;
}

export type CostRecord = {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  characters?: number;
  costMicroUsd: number;
  calls: number;
};

/** What a charged call really cost, kept beside the spend. Best effort: a
 *  failure here is logged and never fails or refunds the action. */
export async function recordCreditCost(
  admin: Client,
  ledgerId: number,
  record: CostRecord,
): Promise<void> {
  try {
    const { error } = await admin.rpc("record_ai_credit_cost", {
      p_spend_id: ledgerId,
      p_provider: record.provider,
      p_model: record.model,
      p_input_tokens: record.inputTokens,
      p_output_tokens: record.outputTokens,
      p_reasoning_tokens: record.reasoningTokens,
      p_characters: record.characters,
      p_cost_micro_usd: Math.round(record.costMicroUsd),
      p_calls: record.calls,
    });
    if (error) throw error;
  } catch (error) {
    console.error("Couldn't record an AI credit cost:", error);
  }
}
