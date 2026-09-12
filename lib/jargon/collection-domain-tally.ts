import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { computeTraceSnapshot } from "@/lib/trace";
import { toTraceState, type ProgressStateRow } from "./progress-state";
import type { CollectionDomainRow } from "./collections";

type Client = SupabaseClient<Database>;

export type { ProgressStateRow };

/** Raw my_progress_state_by_domain rows for every term in `domainIds` —
 *  fetched once by callers that need both the tallied counts (via
 *  tallyDomainStats below) and the individual rows (via
 *  lib/jargon/progress-state.ts's foldProgressStateRows), instead of
 *  hitting the RPC again for a subset of the same domains. */
export async function fetchProgressStateRows(
  client: Client,
  domainIds: string[],
): Promise<ProgressStateRow[]> {
  if (domainIds.length === 0) return [];

  const { data, error } = await client.rpc("my_progress_state_by_domain", {
    p_domain_ids: domainIds,
  });

  if (error) throw error;
  return data;
}

/** "known" is a read-only label derived live from Mastery_adjusted, not a
 *  stored row — replaces the old known_at-row-presence tally. `ever_mastered_at`
 *  is the companion permanent high-water mark: once set it's never cleared,
 *  even as the live label later decays back below the known threshold.
 *  `marked_known_at` is the user's own manual override — separate from both,
 *  but counted into `knownCount`/`termsLearnedCount` too since it reduces
 *  what's left to learn regardless of how it happened; `markedKnownCount`
 *  tracks it on its own for the Mastery page's "N marked known by you" line. */
export function tallyDomainStats(domainIds: string[], data: ProgressStateRow[]) {
  const stats = new Map<
    string,
    { termCount: number; knownCount: number; termsLearnedCount: number; markedKnownCount: number }
  >();
  const now = new Date();

  for (const domainId of domainIds) {
    stats.set(domainId, { termCount: 0, knownCount: 0, termsLearnedCount: 0, markedKnownCount: 0 });
  }

  for (const row of data) {
    const current = stats.get(row.domain_id);
    if (!current) continue;
    current.termCount += 1;
    const markedKnown = row.marked_known_at !== null;
    if (computeTraceSnapshot(toTraceState(row), now).knownLabel === "known" || markedKnown) {
      current.knownCount += 1;
    }
    if (row.ever_mastered_at !== null || markedKnown) {
      current.termsLearnedCount += 1;
    }
    if (markedKnown) {
      current.markedKnownCount += 1;
    }
  }

  return stats;
}

/** Service-role / admin client: stats for an explicit userId (no `auth.uid()` session). */
export async function fetchDomainStatsForUser(client: Client, userId: string, domainIds: string[]) {
  if (domainIds.length === 0) return tallyDomainStats(domainIds, []);

  const { data, error } = await client.rpc("progress_state_by_domain", {
    p_user_id: userId,
    p_domain_ids: domainIds,
  });

  if (error) throw error;
  return tallyDomainStats(domainIds, data);
}

export function applyDomainStats<T extends { id: string }>(
  rows: T[],
  stats: Map<
    string,
    { termCount: number; knownCount: number; termsLearnedCount: number; markedKnownCount: number }
  >,
): (T & CollectionDomainRow)[] {
  return rows.map((row) => {
    const domainStats = stats.get(row.id) ?? {
      termCount: 0,
      knownCount: 0,
      termsLearnedCount: 0,
      markedKnownCount: 0,
    };
    return {
      ...row,
      termCount: domainStats.termCount,
      knownCount: domainStats.knownCount,
      termsLearnedCount: domainStats.termsLearnedCount,
      markedKnownCount: domainStats.markedKnownCount,
    } as T & CollectionDomainRow;
  });
}
