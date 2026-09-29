import type { SupabaseClient } from "@supabase/supabase-js";
import { getFeatureSettings } from "@/lib/ai/feature-settings";
import { countRecentGenerations } from "@/lib/ai/usage";
import type { Database } from "@/lib/supabase/database.types";

/** Used only if the setting can't be read. */
const FALLBACK_DAILY_CAP = 20;

async function dailyCap(admin: SupabaseClient<Database>): Promise<number | null> {
  try {
    const settings = await getFeatureSettings(admin, "narration_story");
    return settings ? settings.dailyCap : FALLBACK_DAILY_CAP;
  } catch (err) {
    console.error("Couldn't read the story narration cap:", err);
    return FALLBACK_DAILY_CAP;
  }
}

/** False when this person has used up their story narrations for the day. */
export async function storyWithinDailyCap(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const cap = await dailyCap(admin);
  if (cap === null) return true;
  return (await countRecentGenerations(admin, userId, "narration_story")) < cap;
}
