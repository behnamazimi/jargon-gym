import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type QuizPreferences = {
  markUnknownOnFail: boolean;
  markKnownOnPass: boolean;
};

const DEFAULT_PREFERENCES: QuizPreferences = {
  markUnknownOnFail: true,
  markKnownOnPass: false,
};

export async function getUserQuizPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuizPreferences> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("mark_unknown_on_fail, mark_known_on_pass")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return DEFAULT_PREFERENCES;

  return {
    markUnknownOnFail: data.mark_unknown_on_fail,
    markKnownOnPass: data.mark_known_on_pass,
  };
}
