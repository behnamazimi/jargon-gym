import type { SupabaseClient } from "@supabase/supabase-js";
import { getRequestUserSettingsRow } from "@/lib/streak/settings";
import type { Database } from "@/lib/supabase/database.types";
import { EMPTY_TERM_LAYOUT, parseTermLayout, type TermLayout } from "@/lib/terms/term-layout";

type Client = SupabaseClient<Database>;

/** For rendering: shares the request's one settings read. */
export async function getRequestTermLayout(userId: string): Promise<TermLayout> {
  const row = await getRequestUserSettingsRow(userId);
  return row ? parseTermLayout(row.term_layout) : EMPTY_TERM_LAYOUT;
}

/** For saving: always reads the stored value so a change builds on it. */
export async function loadTermLayout(client: Client, userId: string): Promise<TermLayout> {
  const { data, error } = await client
    .from("user_settings")
    .select("term_layout")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? parseTermLayout(data.term_layout) : EMPTY_TERM_LAYOUT;
}

export async function saveTermLayout(
  client: Client,
  userId: string,
  layout: TermLayout,
): Promise<void> {
  const { error } = await client.from("user_settings").upsert(
    {
      user_id: userId,
      term_layout: layout,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
