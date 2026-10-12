"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { loadGoalForecast, type GoalForecast } from "@/lib/goals/forecast";
import { GOAL_TIERS, parseDailyGoals, type DailyGoals, type GoalTier } from "@/lib/goals/levels";
import {
  claimGoalCelebration,
  getRequestGoalSettings,
  loadGoalDay,
  saveGoalCelebrate,
  saveGoals,
  type GoalDay,
} from "@/lib/goals/settings";

export async function getGoalsPageData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: "Log in to set your daily goals." as const };

  const [settings, day] = await Promise.all([
    getRequestGoalSettings(auth.user.id),
    loadGoalDay(auth.supabase),
  ]);
  return { settings, day };
}

export async function forecastGoalsAction(
  goals: DailyGoals,
): Promise<{ forecast?: GoalForecast; error?: string }> {
  const parsed = parseDailyGoals(goals);
  if (!parsed) return { error: "Those goals don't look right." };
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    return { forecast: await loadGoalForecast(auth.supabase, auth.user.id, parsed) };
  } catch {
    return { error: "Couldn't work out a forecast. Try again." };
  }
}

export async function saveGoalsAction(
  goals: DailyGoals,
): Promise<{ error?: string; day?: GoalDay }> {
  const parsed = parseDailyGoals(goals);
  if (!parsed) return { error: "Those goals don't look right." };
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await saveGoals(auth.supabase, auth.user.id, parsed);
  } catch {
    return { error: "Couldn't save your goals. Try again." };
  }
  revalidatePath("/app/goals");
  // The goals are saved by now; without a fresh day the page keeps its own.
  const day = await loadGoalDay(auth.supabase).catch(() => undefined);
  return { day };
}

export async function setGoalCelebrateAction(celebrate: boolean): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await saveGoalCelebrate(auth.supabase, auth.user.id, celebrate);
    return {};
  } catch {
    return { error: "Couldn't save that. Try again." };
  }
}

export async function claimGoalCelebrationAction(
  tier: GoalTier,
  caughtUp: boolean,
): Promise<{ claimed: boolean; day?: GoalDay }> {
  if (!GOAL_TIERS.includes(tier)) return { claimed: false };
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { claimed: false };

  try {
    const claimed = await claimGoalCelebration(auth.supabase, tier, caughtUp);
    return { claimed, day: await loadGoalDay(auth.supabase) };
  } catch {
    return { claimed: false };
  }
}
