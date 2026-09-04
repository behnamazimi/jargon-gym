import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type NarrationSettings = {
  enabled: boolean;
};

export async function getNarrationSettingsForAdmin(client: Client): Promise<NarrationSettings> {
  const { data, error } = await client
    .from("narration_settings")
    .select("enabled")
    .eq("id", true)
    .single();

  if (error) throw error;
  return { enabled: data.enabled };
}
