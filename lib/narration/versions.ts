import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getNarrationAccessForUser } from "./access";
import { DEFAULT_NARRATION_MODE, getNarrationModes } from "./mode";
import {
  chunkIds,
  isCurrentAudio,
  loadLiveJobs,
  TERM_FIELD_COLUMNS,
  type TermRow,
} from "./sync-missing";

type AdminClient = SupabaseClient<Database>;

/** The job id of each term's current clip, or null when it has none (never
 *  made, still pending, failed or out of date). The player puts the id in the
 *  clip's address so the browser can keep the file. Callers must already have
 *  checked that the person may read these terms and has narration access. */
export async function loadNarrationVersions(
  admin: AdminClient,
  termIds: string[],
): Promise<Map<string, string | null>> {
  const versions = new Map<string, string | null>(termIds.map((id) => [id, null]));
  if (termIds.length === 0) return versions;

  const terms: TermRow[] = [];
  for (const chunk of chunkIds(termIds)) {
    const { data, error } = await admin
      .from("terms")
      .select(TERM_FIELD_COLUMNS)
      .in("id", chunk)
      .not("definition", "is", null);
    if (error) throw error;
    terms.push(...((data ?? []) as TermRow[]));
  }

  const [modes, jobs] = await Promise.all([
    getNarrationModes(admin, [...new Set(terms.map((term) => term.domain_id))]),
    loadLiveJobs(
      admin,
      terms.map((term) => term.id),
    ),
  ]);

  for (const term of terms) {
    const job = jobs.get(term.id);
    const mode = modes.get(term.domain_id) ?? DEFAULT_NARRATION_MODE;
    if (job && isCurrentAudio(term, job, mode)) versions.set(term.id, job.id);
  }
  return versions;
}

/** Adds `narrationVersion` to each term when the person has narration. Without
 *  access, or if the lookup fails, the terms come back untouched and the
 *  player falls back to asking the server for the clip. */
export async function attachNarrationVersions<T extends { id: string }>(
  admin: AdminClient,
  userId: string,
  terms: T[],
): Promise<(T & { narrationVersion?: string | null })[]> {
  if (terms.length === 0) return terms;
  try {
    if (!(await getNarrationAccessForUser(admin, userId))) return terms;
    const versions = await loadNarrationVersions(
      admin,
      terms.map((term) => term.id),
    );
    return terms.map((term) => ({ ...term, narrationVersion: versions.get(term.id) ?? null }));
  } catch (error) {
    console.error("Couldn't look up narration clips:", error);
    return terms;
  }
}
