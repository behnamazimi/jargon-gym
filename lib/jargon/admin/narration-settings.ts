import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type NarrationSettings = {
  enabled: boolean;
};

/** The one narration switch the admin page shows. It drives both narration
 *  features, and shows as on only when both are, so a difference made outside
 *  the page doesn't read as "on". */
export async function getNarrationSettingsForAdmin(client: Client): Promise<NarrationSettings> {
  const { data, error } = await client
    .from("ai_feature_settings")
    .select("enabled")
    .in("feature", ["narration_term", "narration_story"]);

  if (error) throw error;
  return { enabled: data.length === 2 && data.every((row) => row.enabled) };
}
