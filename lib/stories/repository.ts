import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainLanguage } from "@/lib/jargon/languages";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  parseCefrLevel,
  parseLanguage,
  parseReadingLevel,
  type Story,
  type StoryLevels,
  type StoryTerm,
  type StorySegment,
  type StoryVote,
} from "./types";

type Client = SupabaseClient<Database>;
type StoryRow = Database["public"]["Tables"]["stories"]["Row"];

const RECENT_VOTE_LIMIT = 50;

const STORY_COLUMNS =
  "id, domain_id, language, format, tone, reading_level, cefr_level, outline, title, segments, term_ids, new_term_ids, vote, read_at";

function toVote(value: number | null): -1 | 1 | null {
  return value === 1 || value === -1 ? value : null;
}

type StoryRowSubset = Pick<
  StoryRow,
  | "id"
  | "domain_id"
  | "language"
  | "format"
  | "tone"
  | "reading_level"
  | "cefr_level"
  | "outline"
  | "title"
  | "segments"
  | "term_ids"
  | "new_term_ids"
  | "vote"
  | "read_at"
>;

function mapStory(row: StoryRowSubset): Story {
  return {
    id: row.id,
    domainId: row.domain_id,
    language: parseLanguage(row.language),
    format: row.format,
    tone: row.tone,
    readingLevel: parseReadingLevel(row.reading_level),
    cefrLevel: parseCefrLevel(row.cefr_level),
    outline: row.outline,
    title: row.title,
    segments: row.segments as StorySegment[],
    termIds: row.term_ids,
    newTermIds: row.new_term_ids,
    vote: toVote(row.vote),
    readAt: row.read_at,
  };
}

export async function insertStory(
  admin: Client,
  input: {
    userId: string;
    domainId: string;
    language: DomainLanguage;
    format: string;
    tone: string;
    levels: StoryLevels;
    outline: string | null;
    title: string;
    segments: StorySegment[];
    termIds: string[];
    newTermIds: string[];
  },
): Promise<Story> {
  const { data, error } = await admin
    .from("stories")
    .insert({
      user_id: input.userId,
      domain_id: input.domainId,
      language: input.language,
      format: input.format,
      tone: input.tone,
      reading_level: input.levels.readingLevel,
      cefr_level: input.levels.cefrLevel,
      outline: input.outline,
      title: input.title,
      segments: input.segments as unknown as Json,
      term_ids: input.termIds,
      new_term_ids: input.newTermIds,
    })
    .select(STORY_COLUMNS)
    .single();
  if (error) throw error;
  return mapStory(data);
}

export async function getStoryForUser(
  admin: Client,
  userId: string,
  storyId: string,
): Promise<Story | null> {
  const { data, error } = await admin
    .from("stories")
    .select(STORY_COLUMNS)
    .eq("id", storyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapStory(data) : null;
}

/** The story Read and Stories open into: the newest one the user hasn't
 *  marked read or dismissed. */
export async function getCurrentStory(admin: Client, userId: string): Promise<Story | null> {
  const { data, error } = await admin
    .from("stories")
    .select(STORY_COLUMNS)
    .eq("user_id", userId)
    .is("read_at", null)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapStory(data) : null;
}

export async function hasCurrentStory(admin: Client, userId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("stories")
    .select("id")
    .eq("user_id", userId)
    .is("read_at", null)
    .is("dismissed_at", null)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Dismisses the user's unread stories, except `keepStoryId` when given. */
export async function dismissUnreadStories(
  admin: Client,
  userId: string,
  options: { onlyStoryId?: string; keepStoryId?: string } = {},
): Promise<void> {
  let query = admin
    .from("stories")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null)
    .is("dismissed_at", null);
  if (options.onlyStoryId) query = query.eq("id", options.onlyStoryId);
  if (options.keepStoryId) query = query.neq("id", options.keepStoryId);
  const { error } = await query;
  if (error) throw error;
}

export async function getStoryTerms(admin: Client, termIds: string[]): Promise<StoryTerm[]> {
  if (termIds.length === 0) return [];
  const { data, error } = await admin
    .from("terms")
    .select("id, term, definition")
    .in("id", termIds);
  if (error) throw error;
  return data ?? [];
}

export async function getCollection(
  admin: Client,
  domainId: string,
): Promise<{ name: string; language: DomainLanguage } | null> {
  const { data, error } = await admin
    .from("domains")
    .select("name, language")
    .eq("id", domainId)
    .maybeSingle();
  if (error) throw error;
  return data ? { name: data.name, language: parseLanguage(data.language) } : null;
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

export async function setVote(
  admin: Client,
  userId: string,
  storyId: string,
  vote: -1 | 1 | null,
): Promise<void> {
  const { error } = await admin
    .from("stories")
    .update({ vote })
    .eq("id", storyId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Sets read_at only if it isn't set yet, so a double tap or a second tab
 *  can't credit the same piece twice. Returns the term ids to credit, or
 *  null when the piece was already read (or isn't this user's). */
export async function markStoryRead(
  admin: Client,
  userId: string,
  storyId: string,
): Promise<{ readAt: string; termIds: string[] } | null> {
  const { data, error } = await admin
    .from("stories")
    .update({ read_at: new Date().toISOString() })
    .eq("id", storyId)
    .eq("user_id", userId)
    .is("read_at", null)
    .select("read_at, term_ids")
    .maybeSingle();
  if (error) throw error;
  if (!data?.read_at) return null;
  return { readAt: data.read_at, termIds: data.term_ids };
}
