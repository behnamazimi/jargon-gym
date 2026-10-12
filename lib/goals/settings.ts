import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getRequestUserSettingsRow } from "@/lib/streak/settings";
import { GOAL_TIERS, parseDailyGoals, raisedTiers, type DailyGoals, type GoalTier } from "./levels";
import { EMPTY_GOAL_COUNTS, type GoalDayCounts } from "./progress";

type Client = SupabaseClient<Database>;

export type GoalSettings = {
  /** Null until the user saves goals once. */
  goals: DailyGoals | null;
  celebrate: boolean;
};

export type GoalDay = {
  /** The user's local date these counts are for, "YYYY-MM-DD". */
  date: string | null;
  counts: GoalDayCounts;
  celebrated: GoalTier[];
};

export const EMPTY_GOAL_DAY: GoalDay = { date: null, counts: EMPTY_GOAL_COUNTS, celebrated: [] };

/** For rendering: shares the request's one settings read. */
export async function getRequestGoalSettings(userId: string): Promise<GoalSettings> {
  const row = await getRequestUserSettingsRow(userId);
  return {
    goals: row ? parseDailyGoals(row.daily_goals) : null,
    celebrate: row?.goal_celebrate ?? true,
  };
}

/** Raising a goal, or turning one back on, reopens that tier's celebration for
 *  today, so reaching the new goal celebrates again. Lowering or turning a goal
 *  off doesn't. */
export async function saveGoals(client: Client, userId: string, goals: DailyGoals): Promise<void> {
  const { data: current, error: readError } = await client
    .from("user_settings")
    .select("daily_goals, goal_celebrated")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw readError;

  const update: Database["public"]["Tables"]["user_settings"]["Insert"] = {
    user_id: userId,
    daily_goals: goals,
    updated_at: new Date().toISOString(),
  };
  const reopened = raisedTiers(parseDailyGoals(current?.daily_goals), goals);
  const celebrated = current?.goal_celebrated as { date?: string; tiers?: unknown } | null;
  if (reopened.length > 0 && Array.isArray(celebrated?.tiers)) {
    update.goal_celebrated = {
      ...celebrated,
      tiers: celebrated.tiers.filter((tier) => !(reopened as unknown[]).includes(tier)),
    };
  }

  const { error } = await client.from("user_settings").upsert(update, { onConflict: "user_id" });
  if (error) throw error;
}

export async function saveGoalCelebrate(
  client: Client,
  userId: string,
  celebrate: boolean,
): Promise<void> {
  const { error } = await client
    .from("user_settings")
    .upsert(
      { user_id: userId, goal_celebrate: celebrate, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}

export async function loadGoalDay(client: Client): Promise<GoalDay> {
  const { data, error } = await client.rpc("my_get_goal_day");
  if (error) throw error;
  const row = data?.[0];
  if (!row) return EMPTY_GOAL_DAY;
  return {
    date: row.today,
    counts: { read: row.read_count, review: row.reviewed_count, quiz: row.quizzed_count },
    celebrated: row.celebrated.filter((tier): tier is GoalTier =>
      (GOAL_TIERS as readonly string[]).includes(tier),
    ),
  };
}

/** True when this call is the one that gets to celebrate the tier today. */
export async function claimGoalCelebration(
  client: Client,
  tier: GoalTier,
  caughtUp: boolean,
): Promise<boolean> {
  const { data, error } = await client.rpc("my_claim_goal_celebration", {
    p_tier: tier,
    p_caught_up: caughtUp,
  });
  if (error) throw error;
  return data === true;
}
