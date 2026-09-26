import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { parseCefrLevel, parseReadingLevel, type StoryLevels } from "./types";

type Client = SupabaseClient<Database>;

export async function loadPrefs(
  admin: Client,
  userId: string,
): Promise<{ lastDomainId: string | null; levelsByDomain: Record<string, StoryLevels> }> {
  const [prefs, settings] = await Promise.all([
    admin
      .from("story_collection_prefs")
      .select("domain_id, reading_level, cefr_level")
      .eq("user_id", userId),
    admin.from("user_settings").select("story_last_domain_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (prefs.error) throw prefs.error;
  if (settings.error) throw settings.error;

  const levelsByDomain: Record<string, StoryLevels> = {};
  for (const row of prefs.data ?? []) {
    levelsByDomain[row.domain_id] = {
      readingLevel: parseReadingLevel(row.reading_level),
      cefrLevel: parseCefrLevel(row.cefr_level),
    };
  }
  return { lastDomainId: settings.data?.story_last_domain_id ?? null, levelsByDomain };
}

export async function savePrefs(
  admin: Client,
  userId: string,
  domainId: string,
  levels: StoryLevels,
): Promise<void> {
  const now = new Date().toISOString();
  const [prefs, settings] = await Promise.all([
    admin.from("story_collection_prefs").upsert(
      {
        user_id: userId,
        domain_id: domainId,
        reading_level: levels.readingLevel,
        cefr_level: levels.cefrLevel,
        updated_at: now,
      },
      { onConflict: "user_id,domain_id" },
    ),
    admin
      .from("user_settings")
      .upsert(
        { user_id: userId, story_last_domain_id: domainId, updated_at: now },
        { onConflict: "user_id" },
      ),
  ]);
  if (prefs.error) throw prefs.error;
  if (settings.error) throw settings.error;
}
