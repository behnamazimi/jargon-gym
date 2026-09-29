import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CreditSettingsInput } from "./settings-schema";

type Client = SupabaseClient<Database>;

export type AiCreditSettingsView = CreditSettingsInput & { enabled: boolean };

export type AiCreditUsageRow = {
  userId: string;
  email: string;
  spent: number;
  granted: number;
  remaining: number;
  lastActivity: string;
};

export type AiCreditSummary = {
  totalUsers: number;
  usersWithUse: number;
  usersExhausted: number;
  usersWithOwnKey: number;
  creditsSpent: number;
  spends24h: number;
  refunds24h: number;
  refundUsers24h: number;
};

export type AiCreditFailureReason = {
  reason: string;
  failures: number;
  people: number;
  lastSeen: string;
};

export async function getAiCreditSettingsForAdmin(client: Client): Promise<AiCreditSettingsView> {
  const [{ data, error }, { data: prices, error: pricesError }] = await Promise.all([
    client
      .from("ai_credit_settings")
      .select("enabled, default_allowance, monthly_refill")
      .eq("id", true)
      .single(),
    client
      .from("ai_feature_settings")
      .select("feature, credit_cost")
      .in("feature", ["quiz", "story"]),
  ]);
  if (error) throw error;
  if (pricesError) throw pricesError;

  const price = (feature: string) => prices?.find((row) => row.feature === feature)?.credit_cost;
  const quiz = price("quiz");
  const story = price("story");
  if (quiz == null || story == null) throw new Error("AI credit prices are not set.");

  return {
    enabled: data.enabled,
    defaultAllowance: data.default_allowance,
    monthlyRefill: data.monthly_refill,
    quizCreditsPerQuestion: quiz,
    storyCreditsPerTerm: story,
  };
}

export async function listAiCreditUsageForAdmin(client: Client): Promise<AiCreditUsageRow[]> {
  const { data, error } = await client.rpc("admin_ai_credit_usage", { p_limit: 200 });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    userId: row.user_id,
    email: row.email,
    spent: row.spent,
    granted: row.granted,
    remaining: row.remaining,
    lastActivity: row.last_activity,
  }));
}

export async function getAiCreditSummaryForAdmin(client: Client): Promise<AiCreditSummary> {
  const { data, error } = await client.rpc("admin_ai_credit_summary");
  if (error) throw error;

  const row = data?.[0];
  if (!row) throw new Error("Couldn't load AI credit metrics.");

  return {
    totalUsers: row.total_users,
    usersWithUse: row.users_with_use,
    usersExhausted: row.users_exhausted,
    usersWithOwnKey: row.users_with_own_key,
    creditsSpent: row.credits_spent,
    spends24h: row.spends_24h,
    refunds24h: row.refunds_24h,
    refundUsers24h: row.refund_users_24h,
  };
}

/** The most common reasons for refunds in the last 24 hours. */
export async function listAiCreditFailureReasonsForAdmin(
  client: Client,
): Promise<AiCreditFailureReason[]> {
  const { data, error } = await client.rpc("admin_ai_credit_failure_reasons", { p_limit: 5 });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    reason: row.reason,
    failures: row.failures,
    people: row.people,
    lastSeen: row.last_seen,
  }));
}
