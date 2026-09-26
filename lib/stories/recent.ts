import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { toVote } from "./repository";
import type { StoryVote } from "./types";

type Client = SupabaseClient<Database>;

const RECENT_TITLE_LIMIT = 8;
const RECENT_VOTE_LIMIT = 50;

export async function loadRecentTitles(
  admin: Client,
  userId: string,
  domainId: string,
): Promise<string[]> {
  const { data, error } = await admin
    .from("stories")
    .select("title")
    .eq("user_id", userId)
    .eq("domain_id", domainId)
    .order("created_at", { ascending: false })
    .limit(RECENT_TITLE_LIMIT);
  if (error) throw error;
  return (data ?? []).map((row) => row.title);
}

export async function loadRecentVotes(admin: Client, userId: string): Promise<StoryVote[]> {
  const { data, error } = await admin
    .from("stories")
    .select("format, tone, vote, created_at")
    .eq("user_id", userId)
    .not("vote", "is", null)
    .order("created_at", { ascending: false })
    .limit(RECENT_VOTE_LIMIT);
  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const vote = toVote(row.vote);
    return vote
      ? [{ format: row.format, tone: row.tone, vote, createdAt: new Date(row.created_at) }]
      : [];
  });
}
