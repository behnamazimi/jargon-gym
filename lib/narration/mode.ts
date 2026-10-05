import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const NARRATION_MODES = ["term", "full"] as const;
export type NarrationMode = (typeof NARRATION_MODES)[number];

/** A collection with no settings row is narrated with the term name only. */
export const DEFAULT_NARRATION_MODE: NarrationMode = "term";

const MODE_LABELS: Record<NarrationMode, string> = {
  term: "Term only",
  full: "Full (term, definition, details)",
};

export function narrationModeLabel(mode: NarrationMode): string {
  return MODE_LABELS[mode];
}

export function parseNarrationMode(value: unknown): NarrationMode {
  return NARRATION_MODES.find((mode) => mode === value) ?? DEFAULT_NARRATION_MODE;
}

type Client = SupabaseClient<Database>;

/** Modes for the given collections; one without a row gets the default. */
export async function getNarrationModes(
  client: Client,
  domainIds: string[],
): Promise<Map<string, NarrationMode>> {
  const modes = new Map<string, NarrationMode>();
  if (domainIds.length === 0) return modes;

  const { data, error } = await client
    .from("collection_narration_settings")
    .select("domain_id, mode")
    .in("domain_id", domainIds);
  if (error) throw error;

  for (const row of data ?? []) modes.set(row.domain_id, parseNarrationMode(row.mode));
  return modes;
}

export async function getNarrationMode(client: Client, domainId: string): Promise<NarrationMode> {
  const modes = await getNarrationModes(client, [domainId]);
  return modes.get(domainId) ?? DEFAULT_NARRATION_MODE;
}
