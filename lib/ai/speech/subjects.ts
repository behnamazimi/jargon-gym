import type { SupabaseClient } from "@supabase/supabase-js";
import { computeContentHash } from "@/lib/narration/content-hash";
import { computeContentHashV2 } from "@/lib/narration/content-hash-v2";
import { buildNarrationScript } from "@/lib/narration/template";
import type { NarratedTermFields } from "@/lib/narration/types";
import { parseLanguage } from "@/lib/jargon/languages";
import { getStoryForUser } from "@/lib/stories/repository";
import type { Database } from "@/lib/supabase/database.types";
import type { SpeechSubject } from "./types";

type Client = SupabaseClient<Database>;

const TERM_COLUMNS =
  "term, definition, example, mental_model, discussion, anti_example, controversy, domains(language)";

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

  const { domains, ...fields } = data;
  const language = parseLanguage(domains?.language);
  const narrated: NarratedTermFields = fields;
  return {
    type: "term",
    id: termId,
    userId: null,
    contentHash: computeContentHashV2(narrated, language),
    legacyHash: computeContentHash(narrated),
    loadScript: async () => ({ script: buildNarrationScript(narrated, language), language }),
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
      const title = /[.!?…]$/.test(story.title.trim()) ? story.title : `${story.title}.`;
      const script = `${title}\n\n${story.segments.map((segment) => segment.text).join("")}`;
      return { script, language: story.language };
    },
  };
}
