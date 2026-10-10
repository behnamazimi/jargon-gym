import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { parseCefrLevel, parsePieceLength, type StoryLevels } from "./types";

type Client = SupabaseClient<Database>;

export async function loadPrefs(
  admin: Client,
  userId: string,
): Promise<{ lastCollectionId: string | null; levelsByCollection: Record<string, StoryLevels> }> {
  const [prefs, settings] = await Promise.all([
    admin
      .from("story_collection_prefs")
      .select("collection_id, cefr_level, piece_length")
      .eq("user_id", userId),
    admin
      .from("user_settings")
      .select("story_last_collection_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (prefs.error) throw prefs.error;
  if (settings.error) throw settings.error;

  const levelsByCollection: Record<string, StoryLevels> = {};
  for (const row of prefs.data ?? []) {
    levelsByCollection[row.collection_id] = {
      cefrLevel: parseCefrLevel(row.cefr_level),
      pieceLength: parsePieceLength(row.piece_length),
    };
  }
  return { lastCollectionId: settings.data?.story_last_collection_id ?? null, levelsByCollection };
}

export async function savePrefs(
  admin: Client,
  userId: string,
  collectionId: string,
  levels: StoryLevels,
): Promise<void> {
  const now = new Date().toISOString();
  const [prefs, settings] = await Promise.all([
    admin.from("story_collection_prefs").upsert(
      {
        user_id: userId,
        collection_id: collectionId,
        cefr_level: levels.cefrLevel,
        piece_length: levels.pieceLength,
        updated_at: now,
      },
      { onConflict: "user_id,collection_id" },
    ),
    admin
      .from("user_settings")
      .upsert(
        { user_id: userId, story_last_collection_id: collectionId, updated_at: now },
        { onConflict: "user_id" },
      ),
  ]);
  if (prefs.error) throw prefs.error;
  if (settings.error) throw settings.error;
}
