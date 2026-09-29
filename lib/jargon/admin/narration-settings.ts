import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type NarrationSettings = {
  enabled: boolean;
};

/** The one narration switch the admin page shows. It drives both narration
 *  features, so the term row stands for both. */
export async function getNarrationSettingsForAdmin(client: Client): Promise<NarrationSettings> {
  const { data, error } = await client
    .from("ai_feature_settings")
    .select("enabled")
    .eq("feature", "narration_term")
    .single();

  if (error) throw error;
  return { enabled: data.enabled };
}
