import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { deleteAudio } from "./storage";

type Client = SupabaseClient<Database>;

/** Long enough that a build rolled back after a release still finds its clips. */
const MIN_AGE_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 25;
const DEFAULT_BUDGET_MS = 10_000;

/** Removes the files of superseded jobs (an edited term, a regenerated clip,
 *  a deleted term or story) and clears the path once the file is gone. A path
 *  that a live job also uses (version 1 files are reused) is left alone: the
 *  live job owns it. Best effort; a failed row is retried on the next call. */
export async function sweepSupersededAudio(
  admin: Client,
  options: { limit?: number; budgetMs?: number } = {},
): Promise<number> {
  const { limit = DEFAULT_LIMIT, budgetMs = DEFAULT_BUDGET_MS } = options;
  const deadline = Date.now() + budgetMs;

  const { data: rows, error } = await admin
    .from("audio_jobs")
    .select("id, storage_path")
    .eq("status", "superseded")
    .not("storage_path", "is", null)
    .lt("updated_at", new Date(Date.now() - MIN_AGE_MS).toISOString())
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let cleared = 0;
  for (const row of rows ?? []) {
    if (Date.now() >= deadline) break;
    if (!row.storage_path) continue;
    try {
      const { data: inUse, error: useError } = await admin
        .from("audio_jobs")
        .select("id")
        .eq("storage_path", row.storage_path)
        .neq("status", "superseded")
        .limit(1);
      if (useError) throw useError;
      if ((inUse ?? []).length === 0) await deleteAudio(row.storage_path);

      const { error: clearError } = await admin
        .from("audio_jobs")
        .update({ storage_path: null })
        .eq("id", row.id)
        .eq("status", "superseded")
        .select("id");
      if (clearError) throw clearError;
      cleared += 1;
    } catch (err) {
      console.error("Couldn't sweep an audio file:", err);
    }
  }
  return cleared;
}
