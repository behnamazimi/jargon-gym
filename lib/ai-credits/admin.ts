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

/** The settings the admin form edits: what new accounts get, and the price rows in effect. */
export async function getAiCreditSettingsForAdmin(client: Client): Promise<AiCreditSettingsView> {
  const now = new Date().toISOString();
  const [
    { data, error },
    { data: policies, error: policiesError },
    { data: prices, error: pricesError },
  ] = await Promise.all([
    client.from("ai_credit_settings").select("enabled").eq("id", true).single(),
    client
      .from("credit_grant_policies")
      .select("source, amount, accounts_created_to, effective_from, effective_to, id")
      .is("accounts_created_to", null)
      .lte("effective_from", now)
      .order("id", { ascending: false }),
    client
      .from("credit_prices")
      .select("feature, base_credits, credits_per_unit, effective_from")
      .lte("effective_from", now)
      .order("effective_from", { ascending: false }),
  ]);
  if (error) throw error;
  if (policiesError) throw policiesError;
  if (pricesError) throw pricesError;

  const inEffect = (policies ?? []).filter((row) => !row.effective_to || row.effective_to > now);
  const amount = (source: string) => inEffect.find((row) => row.source === source)?.amount ?? 0;
  const price = (feature: string) => {
    const row = prices?.find((candidate) => candidate.feature === feature);
    if (!row) throw new Error("AI credit prices are not set.");
    return { base: Number(row.base_credits), perUnit: Number(row.credits_per_unit) };
  };

  return {
    enabled: data.enabled,
    defaultAllowance: amount("starter"),
    monthlyRefill: amount("monthly"),
    selfTopupAmount: amount("self_topup"),
    quizCreditsPerQuestion: price("quiz").perUnit,
    storyBaseCredits: price("story").base,
    storyCreditsPerTerm: price("story").perUnit,
    narrationCreditsPerThousand: price("narration_story").perUnit,
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
