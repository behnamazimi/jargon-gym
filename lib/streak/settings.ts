import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type StudyPhoneUserSettings = {
  timezone: string | null;
  currentStreak: number;
  longestStreak: number;
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
      "timezone, current_streak, longest_streak, tour_status, tour_seen, analytics_consent, analytics_consent_at, analytics_consent_version, promo_seen, promo_dismissed, term_layout, created_at",
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
  if (!data) return { timezone: null, currentStreak: 0, longestStreak: 0 };

  return {
    timezone: data.timezone,
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
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
