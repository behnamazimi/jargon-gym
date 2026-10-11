import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { EMPTY_STREAK, streakSummary, type StreakSummary } from "@/lib/streak/status";

type Client = SupabaseClient<Database>;

export type StudyPhoneUserSettings = {
  timezone: string | null;
  streak: StreakSummary;
};

/** The signed-in user's settings row, read once per request for every piece
 *  of page chrome that needs part of it (header, phone chrome, tour). */
export const getRequestUserSettingsRow = cache(async function getRequestUserSettingsRow(
  userId: string,
) {
  const client = await createClient();
  const { data, error } = await client
    .from("user_settings")
    .select(
      "timezone, current_streak, longest_streak, last_active_date, tour_status, tour_seen, analytics_consent, analytics_consent_at, analytics_consent_version, promo_seen, promo_dismissed, term_layout, daily_goals, goal_celebrate, created_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
});

export const getStudyPhoneUserSettings = cache(async function getStudyPhoneUserSettings(
  userId: string,
): Promise<StudyPhoneUserSettings> {
  const data = await getRequestUserSettingsRow(userId);
  if (!data) return { timezone: null, streak: EMPTY_STREAK };

  return {
    timezone: data.timezone,
    streak: streakSummary(data),
  };
});

export async function saveUserTimezone(
  client: Client,
  userId: string,
  timezone: string,
): Promise<void> {
  const { error } = await client.from("user_settings").upsert(
    {
      user_id: userId,
      timezone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}
