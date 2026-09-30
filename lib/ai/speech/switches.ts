import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ProviderSwitches } from "./provider";
import type { SpeechSubject } from "./types";

/** Which providers the admin has switched on for this kind of clip. */
export async function getProviderSwitches(
  admin: SupabaseClient<Database>,
  type: SpeechSubject["type"],
): Promise<ProviderSwitches> {
  const { data, error } = await admin
    .from("ai_feature_settings")
    .select("murf_enabled, elevenlabs_enabled")
    .eq("feature", type === "term" ? "narration_term" : "narration_story")
    .single();
  if (error) throw error;
  return { murf: data.murf_enabled, elevenlabs: data.elevenlabs_enabled };
}
