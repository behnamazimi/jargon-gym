import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type ReadOptions = {
  storiesDefault: boolean;
  hideQuestion: boolean;
  revealedDefault: boolean;
};

export type ReadOptionKey = keyof ReadOptions;

export const DEFAULT_READ_OPTIONS: ReadOptions = {
  storiesDefault: false,
  hideQuestion: false,
  revealedDefault: false,
};

const COLUMN_BY_KEY = {
  storiesDefault: "read_stories_default",
  hideQuestion: "read_hide_question",
  revealedDefault: "read_revealed_default",
} as const satisfies Record<ReadOptionKey, string>;

export function isReadOptionKey(value: string): value is ReadOptionKey {
  return Object.hasOwn(COLUMN_BY_KEY, value);
}

/** Cached per request: the Read layout and page both need it. */
export const getReadOptions = cache(async function getReadOptions(
  client: Client,
  userId: string,
): Promise<ReadOptions> {
  const { data, error } = await client
    .from("user_settings")
    .select("read_stories_default, read_hide_question, read_revealed_default")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_READ_OPTIONS;
  return {
    storiesDefault: data.read_stories_default,
    hideQuestion: data.read_hide_question,
    revealedDefault: data.read_revealed_default,
  };
});

export async function saveReadOption(
  client: Client,
  userId: string,
  key: ReadOptionKey,
  value: boolean,
): Promise<void> {
  const row: Database["public"]["Tables"]["user_settings"]["Insert"] = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  row[COLUMN_BY_KEY[key]] = value;
  const { error } = await client.from("user_settings").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}
