import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CreditCosts, CreditFeature, CreditState } from "./types";

type Client = SupabaseClient<Database>;

/** Prices live on the feature rows. A missing price is an error: charging at
 *  a guessed price is worse than not charging. */
async function getCreditCosts(client: Client): Promise<CreditCosts> {
  const { data, error } = await client
    .from("ai_feature_settings")
    .select("feature, credit_cost")
    .in("feature", ["quiz", "story"]);
  if (error) throw error;

  const cost = (feature: string) => data?.find((row) => row.feature === feature)?.credit_cost;
  const quiz = cost("quiz");
  const story = cost("story");
  if (quiz == null || story == null) throw new Error("AI credit prices are not set.");
  return { quizPerQuestion: quiz, storyPerTerm: story };
}

export type ReserveResult =
  | { status: "ok"; remaining: number; ledgerId: number }
  | { status: "insufficient" | "disabled"; remaining: number };

/** The signed-in user's balance. Pass the user-scoped client. */
export async function getMyCreditState(client: Client): Promise<CreditState | null> {
  const [{ data, error }, costs] = await Promise.all([
    client.rpc("my_ai_credit_state"),
    getCreditCosts(client),
  ]);
  if (error) throw error;

  const row = data?.[0];
  if (!row) return null;

  return {
    enabled: row.enabled,
    total: row.total,
    remaining: row.remaining,
    costs,
  };
}

export async function reserveCredits(
  admin: Client,
  userId: string,
  feature: CreditFeature,
  cost: number,
): Promise<ReserveResult> {
  const { data, error } = await admin.rpc("reserve_ai_credits", {
    p_user_id: userId,
    p_feature: feature,
    p_cost: cost,
  });
  if (error) throw error;

  const row = data?.[0];
  if (!row) throw new Error("Couldn't check AI credits.");
  if (row.status === "ok" && row.ledger_id !== null) {
    return { status: "ok", remaining: row.remaining, ledgerId: row.ledger_id };
  }
  return {
    status: row.status === "disabled" ? "disabled" : "insufficient",
    remaining: row.remaining,
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
