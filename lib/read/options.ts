import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isShadowingGap,
  isShadowingRepeats,
  type ShadowingGap,
  type ShadowingRepeats,
} from "@/lib/stories/shadowing";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type ReadOptions = {
  storiesDefault: boolean;
  hideQuestion: boolean;
  revealedDefault: boolean;
  narrationHighlight: boolean;
  shadowing: boolean;
  shadowingPause: boolean;
  shadowingGap: ShadowingGap;
  shadowingRepeats: ShadowingRepeats;
};

export type ReadOptionKey = keyof ReadOptions;

export const DEFAULT_READ_OPTIONS: ReadOptions = {
  storiesDefault: false,
  hideQuestion: true,
  revealedDefault: false,
  narrationHighlight: true,
  shadowing: false,
  shadowingPause: true,
  shadowingGap: 1,
  shadowingRepeats: 2,
};

const COLUMN_BY_KEY = {
  storiesDefault: "read_stories_default",
  hideQuestion: "read_hide_question",
  revealedDefault: "read_revealed_default",
  narrationHighlight: "read_narration_highlight",
  shadowing: "read_shadowing",
  shadowingPause: "read_shadowing_pause",
  shadowingGap: "read_shadowing_gap",
  shadowingRepeats: "read_shadowing_repeats",
} as const satisfies Record<ReadOptionKey, string>;

export function isReadOptionKey(value: string): value is ReadOptionKey {
  return Object.hasOwn(COLUMN_BY_KEY, value);
}

/** Whether a value is one this option accepts: a switch, or one of the
 *  offered pause lengths or repeat counts. */
export function isReadOptionValue(key: ReadOptionKey, value: unknown): boolean {
  if (key === "shadowingGap") return isShadowingGap(value);
  if (key === "shadowingRepeats") return isShadowingRepeats(value);
  return typeof value === "boolean";
}

/** Cached per request: the Read layout and page both need it. */
export const getReadOptions = cache(async function getReadOptions(
  client: Client,
  userId: string,
): Promise<ReadOptions> {
  const { data, error } = await client
    .from("user_settings")
    .select(
      "read_stories_default, read_hide_question, read_revealed_default, read_narration_highlight, read_shadowing, read_shadowing_pause, read_shadowing_gap, read_shadowing_repeats",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_READ_OPTIONS;
  return {
    storiesDefault: data.read_stories_default,
    hideQuestion: data.read_hide_question,
    revealedDefault: data.read_revealed_default,
    narrationHighlight: data.read_narration_highlight,
    shadowing: data.read_shadowing,
    shadowingPause: data.read_shadowing_pause,
    shadowingGap: isShadowingGap(data.read_shadowing_gap)
      ? data.read_shadowing_gap
      : DEFAULT_READ_OPTIONS.shadowingGap,
    shadowingRepeats: isShadowingRepeats(data.read_shadowing_repeats)
      ? data.read_shadowing_repeats
      : DEFAULT_READ_OPTIONS.shadowingRepeats,
  };
});

type SettingsInsert = Database["public"]["Tables"]["user_settings"]["Insert"];

/** The caller checks the value with `isReadOptionValue` first. */
export async function saveReadOption(
  client: Client,
  userId: string,
  key: ReadOptionKey,
  value: boolean | number,
): Promise<void> {
  const row: SettingsInsert = {
    user_id: userId,
    updated_at: new Date().toISOString(),
    ...({ [COLUMN_BY_KEY[key]]: value } as Partial<SettingsInsert>),
  };
  const { error } = await client.from("user_settings").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}
