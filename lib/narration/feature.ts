import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** The narration switch, read from the AI feature settings. A missing row
 *  counts as off. */
export async function isNarrationEnabled(admin: Client): Promise<boolean> {
  const { data, error } = await admin
    .from("ai_feature_settings")
    .select("enabled")
    .eq("feature", "narration_term")
    .maybeSingle();
  if (error) throw error;
  return data?.enabled ?? false;
}
