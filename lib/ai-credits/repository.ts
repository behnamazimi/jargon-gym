import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CreditFeature, CreditState } from "./types";

type Client = SupabaseClient<Database>;

export type ReserveResult =
  | { status: "ok"; remaining: number; ledgerId: number }
  | { status: "insufficient" | "disabled"; remaining: number };

/** The signed-in user's balance. Pass the user-scoped client. */
export async function getMyCreditState(client: Client): Promise<CreditState | null> {
  const { data, error } = await client.rpc("my_ai_credit_state");
  if (error) throw error;

  const row = data?.[0];
  if (!row) return null;

  return {
    enabled: row.enabled,
    total: row.total,
    remaining: row.remaining,
    costs: {
      quizPerQuestion: row.quiz_credits_per_question,
      storyPerTerm: row.story_credits_per_term,
    },
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
