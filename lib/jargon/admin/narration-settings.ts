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

/** Only a number on the page, so a read that fails shows 0 rather than
 *  taking the whole page down. */
async function usageCount(client: Client, feature: string, since: string): Promise<number> {
  const { count, error } = await client
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("feature", feature)
    .gte("created_at", since);
  if (error) {
    console.error("Couldn't count narration usage:", error);
    return 0;
  }
  return count ?? 0;
}

/** What the admin narration page shows. One switch drives both narration
 *  features and shows as on only when both are, so a difference made outside
 *  the page doesn't read as "on". */
export async function getNarrationSettingsForAdmin(client: Client): Promise<NarrationSettings> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [settings, term, story] = await Promise.all([
    client
      .from("ai_feature_settings")
      .select("feature, enabled, daily_cap")
      .in("feature", [...NARRATION_FEATURES]),
    usageCount(client, "narration_term", since),
    usageCount(client, "narration_story", since),
  ]);
  if (settings.error) throw settings.error;

  const rows = settings.data;
  const capOf = (feature: string) => rows.find((row) => row.feature === feature)?.daily_cap ?? null;

  return {
    enabled: rows.length === 2 && rows.every((row) => row.enabled),
    caps: { term: capOf("narration_term"), story: capOf("narration_story") },
    usageLast24h: { term, story },
  };
}
