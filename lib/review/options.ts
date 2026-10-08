import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type ReviewOptions = {
  narrateOnReveal: boolean;
  swipe: boolean;
};

export type ReviewOptionKey = keyof ReviewOptions;

export const DEFAULT_REVIEW_OPTIONS: ReviewOptions = {
  narrateOnReveal: false,
  swipe: true,
};

const COLUMN_BY_KEY = {
  narrateOnReveal: "review_narrate_on_reveal",
  swipe: "review_swipe",
} as const satisfies Record<ReviewOptionKey, string>;

export function isReviewOptionKey(value: string): value is ReviewOptionKey {
  return Object.hasOwn(COLUMN_BY_KEY, value);
}

/** Cached per request: the page reads it once. */
export const getReviewOptions = cache(async function getReviewOptions(
  client: Client,
  userId: string,
): Promise<ReviewOptions> {
  const { data, error } = await client
    .from("user_settings")
    .select("review_narrate_on_reveal, review_swipe")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_REVIEW_OPTIONS;
  return {
    narrateOnReveal: data.review_narrate_on_reveal,
    swipe: data.review_swipe,
  };
});

type SettingsInsert = Database["public"]["Tables"]["user_settings"]["Insert"];

export async function saveReviewOption(
  client: Client,
  userId: string,
  key: ReviewOptionKey,
  value: boolean,
): Promise<void> {
  const row: SettingsInsert = {
    user_id: userId,
    updated_at: new Date().toISOString(),
    ...({ [COLUMN_BY_KEY[key]]: value } as Partial<SettingsInsert>),
  };
  const { error } = await client.from("user_settings").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}
