import type { SupabaseClient } from "@supabase/supabase-js";
import { computeContentHash } from "@/lib/narration/content-hash";
import { computeNarrationHash } from "@/lib/narration/content-hash-v2";
import { getNarrationMode } from "@/lib/narration/mode";
import { buildNarrationScript } from "@/lib/narration/template";
import type { NarratedTermFields } from "@/lib/narration/types";
import { parseLanguage } from "@/lib/terms/languages";
import { getStoryForUser } from "@/lib/stories/repository";
import { buildStoryScript } from "@/lib/stories/script";
import type { Database } from "@/lib/supabase/database.types";
import type { SpeechSubject } from "./types";

type Client = SupabaseClient<Database>;

const TERM_COLUMNS =
  "collection_id, term, definition, example, mental_model, discussion, anti_example, controversy, collections(language)";

/** Stories never change once written, so a constant stands in for a hash. The
 *  version 1 value is what the earlier mirror wrote. */
const STORY_HASH = "story-v2";
const STORY_LEGACY_HASH = "story-v1";

export async function loadTermSubject(
  admin: Client,
  termId: string,
): Promise<SpeechSubject | null> {
  const { data, error } = await admin
    .from("terms")
    .select(TERM_COLUMNS)
    .eq("id", termId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.definition === null) return null;

  const { collections, collection_id: collectionId, ...fields } = data;
  const language = parseLanguage(collections?.language);
  const narrated: NarratedTermFields = fields;
  const mode = await getNarrationMode(admin, collectionId);
  return {
    type: "term",
    id: termId,
    userId: null,
    contentHash: computeNarrationHash(mode, narrated, language),
    // Only full clips can still be the older version 1 ones.
    legacyHash: mode === "full" ? computeContentHash(narrated) : undefined,
    loadScript: async () => ({ script: buildNarrationScript(narrated, language, mode), language }),
  };
}

/** Null unless the story exists and belongs to this user: the admin client
 *  bypasses RLS, so ownership is checked here. */
export async function loadStorySubject(
  admin: Client,
  userId: string,
  storyId: string,
): Promise<SpeechSubject | null> {
  const { data, error } = await admin
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    type: "story",
    id: storyId,
    userId,
    contentHash: STORY_HASH,
    legacyHash: STORY_LEGACY_HASH,
    loadScript: async () => {
      const story = await getStoryForUser(admin, userId, storyId);
      if (!story) return null;
      return { script: buildStoryScript(story), language: story.language };
    },
  };
}
