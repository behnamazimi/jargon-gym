import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type StudyPhoneUserSettings = {
  timezone: string | null;
  currentStreak: number;
  longestStreak: number;
};

export async function getStudyPhoneUserSettings(
  client: Client,
  userId: string,
): Promise<StudyPhoneUserSettings> {
  const { data, error } = await client
    .from("user_settings")
    .select("timezone, current_streak, longest_streak")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { timezone: null, currentStreak: 0, longestStreak: 0 };

  return {
    timezone: data.timezone,
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
  };
}

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
