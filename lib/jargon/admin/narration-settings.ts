import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

const NARRATION_FEATURES = ["narration_term", "narration_story"] as const;

export type NarrationSettings = {
  enabled: boolean;
  /** Per-person daily caps; null means no cap. */
  caps: { term: number | null; story: number | null };
  /** Provider calls made in the last 24 hours, failed ones included. */
  usageLast24h: { term: number; story: number };
};

/** What the admin narration page shows. One switch drives both narration
 *  features and shows as on only when both are, so a difference made outside
 *  the page doesn't read as "on". */
export async function getNarrationSettingsForAdmin(client: Client): Promise<NarrationSettings> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [settings, usage] = await Promise.all([
    client
      .from("ai_feature_settings")
      .select("feature, enabled, daily_cap")
      .in("feature", [...NARRATION_FEATURES]),
    client
      .from("ai_usage_events")
      .select("feature")
      .in("feature", [...NARRATION_FEATURES])
      .gte("created_at", since),
  ]);
  if (settings.error) throw settings.error;
  if (usage.error) throw usage.error;

  const rows = settings.data;
  const capOf = (feature: string) => rows.find((row) => row.feature === feature)?.daily_cap ?? null;
  const usedBy = (feature: string) => usage.data.filter((row) => row.feature === feature).length;

  return {
    enabled: rows.length === 2 && rows.every((row) => row.enabled),
    caps: { term: capOf("narration_term"), story: capOf("narration_story") },
    usageLast24h: { term: usedBy("narration_term"), story: usedBy("narration_story") },
  };
}
