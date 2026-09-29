import type { SupabaseClient } from "@supabase/supabase-js";
import { synthesizeNarrationAudio } from "@/lib/narration/eleven-labs";
import { uploadNarrationAudio } from "@/lib/narration/storage";
import type { Database } from "@/lib/supabase/database.types";
import { getFeatureSettings } from "@/lib/ai/feature-settings";
import { recordUsage } from "@/lib/ai/usage";
import { getStoryForUser } from "./repository";

type Client = SupabaseClient<Database>;

const PENDING_TIMEOUT_MS = 2 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Used only if the setting can't be read. */
const FALLBACK_DAILY_CAP = 20;

export type StoryNarrationResult =
  | { status: "ready"; storagePath: string }
  | { status: "pending" }
  | { status: "capped" }
  | { status: "unavailable" };

function pathForStory(userId: string, storyId: string): string {
  return `stories/${userId}/${storyId}.mp3`;
}

async function countRecentNarrations(admin: Client, userId: string): Promise<number> {
  const { count, error } = await admin
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("narration_requested_at", new Date(Date.now() - DAY_MS).toISOString());
  if (error) throw error;
  return count ?? 0;
}

/** The per-person daily cap from the AI feature settings; null means no cap. */
async function dailyCapFor(admin: Client): Promise<number | null> {
  try {
    const settings = await getFeatureSettings(admin, "narration_story");
    return settings ? settings.dailyCap : FALLBACK_DAILY_CAP;
  } catch (err) {
    console.error("Couldn't read the story narration cap:", err);
    return FALLBACK_DAILY_CAP;
  }
}

/** Only one caller wins: the row must still be unclaimed, failed, or stuck
 *  pending past the timeout for the update to match. */
async function claimNarration(admin: Client, userId: string, storyId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - PENDING_TIMEOUT_MS).toISOString();
  const { data, error } = await admin
    .from("stories")
    .update({ narration_status: "pending", narration_requested_at: new Date().toISOString() })
    .eq("id", storyId)
    .eq("user_id", userId)
    .or(
      `narration_status.in.(none,failed),and(narration_status.eq.pending,narration_requested_at.lt.${staleBefore})`,
    )
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

async function setNarrationResult(
  admin: Client,
  storyId: string,
  result: { status: "ready"; path: string } | { status: "failed" },
) {
  await admin
    .from("stories")
    .update(
      result.status === "ready"
        ? { narration_status: "ready", narration_path: result.path }
        : { narration_status: "failed" },
    )
    .eq("id", storyId);
}

export async function getOrGenerateStoryNarration(
  admin: Client,
  userId: string,
  storyId: string,
): Promise<StoryNarrationResult> {
  const { data: row, error } = await admin
    .from("stories")
    .select("narration_status, narration_path, narration_requested_at")
    .eq("id", storyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return { status: "unavailable" };

  if (row.narration_status === "ready" && row.narration_path) {
    return { status: "ready", storagePath: row.narration_path };
  }

  const requestedAt = row.narration_requested_at ? Date.parse(row.narration_requested_at) : 0;
  if (row.narration_status === "pending" && Date.now() - requestedAt < PENDING_TIMEOUT_MS) {
    return { status: "pending" };
  }

  const cap = await dailyCapFor(admin);
  if (cap !== null && (await countRecentNarrations(admin, userId)) >= cap) {
    return { status: "capped" };
  }

  if (!(await claimNarration(admin, userId, storyId))) return { status: "pending" };

  const story = await getStoryForUser(admin, userId, storyId);
  if (!story) return { status: "unavailable" };

  const path = pathForStory(userId, storyId);
  const script = `${story.title}\n\n${story.segments.map((segment) => segment.text).join("")}`;
  try {
    const audio = await synthesizeNarrationAudio(script, story.language);
    await uploadNarrationAudio(path, audio);
    await setNarrationResult(admin, storyId, { status: "ready", path });
  } catch (err) {
    console.error("Story narration failed:", err);
    await setNarrationResult(admin, storyId, { status: "failed" });
    await recordUsage(admin, { userId, feature: "narration_story", units: 0, outcome: "failed" });
    return { status: "unavailable" };
  }

  await recordUsage(admin, {
    userId,
    feature: "narration_story",
    units: script.length,
    outcome: "ok",
  });
  return { status: "ready", storagePath: path };
}
