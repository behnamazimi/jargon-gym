import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { aggregateMastery, computeTraceSnapshot, daysBetween, type KnownLabel } from "@/lib/trace";
import { fetchActiveTraceCandidates } from "@/lib/trace-queue";
import { resolveReviewDomainIds } from "./known-state";

type Client = SupabaseClient<Database>;

/** Just enough to populate the term list's collection filter — the
 *  known/total/percentage breakdown per collection lives in
 *  collection-stats.ts's WebStatsSnapshot, which is what the overview card
 *  actually renders. */
export type MasteryCollectionOption = {
  domainId: string;
  domainName: string;
};

/** A coarser 3-band read of the same knownLabel a term already carries
 *  elsewhere in the app — weak/medium/strong instead of
 *  unknown/learning/known, for the term list's filter chips. Same
 *  thresholds (§9), just relabeled for this view. */
export type MasteryTier = "weak" | "medium" | "strong";

/** The "learned in N days" reward line — first-touch-to-mastered span for
 *  a term that has crossed the known threshold. Dates are ISO strings (not
 *  Date objects) so the row can cross the server/client boundary the same
 *  way the rest of MasteryTermRow does; the component formats them for
 *  display in the viewer's own locale. */
export type MasteryTermJourney = {
  firstSeenAt: string;
  masteredAt: string;
  /** Rounded, floored at 1 — a same-day mastery still reads as "1 day". */
  learnedInDays: number;
};

export type MasteryTermRow = {
  termId: string;
  term: string;
  domainId: string;
  domainName: string;
  category: string;
  /** Mastery_adjusted scaled to 0–100 for display. */
  score: number;
  tier: MasteryTier;
  /** True only when the label is "known" (mastery ≥0.8 & n≥3) — the same
   *  bar the checkmark badge elsewhere in the app uses. */
  known: boolean;
  /** Null unless known — and, as an edge case, if a mastered term somehow
   *  has no review_events row to date its first touch from. */
  journey: MasteryTermJourney | null;
};

export type MasteryOverviewData = {
  collections: MasteryCollectionOption[];
  /** §8 "current strength" — live OverallMastery across every started term
   *  (≥1 Read). Decays with inactivity by design, unlike termsLearned. */
  currentStrength: number;
  /** §8 "terms learned" — high-water mark count of terms that ever crossed
   *  the known threshold. Never decreases even as currentStrength decays. */
  termsLearned: number;
  /** Every term across active collections, ranked by score descending, for
   *  the searchable/filterable term list. */
  termRows: MasteryTermRow[];
};

/** First-touch timestamp per term, from the append-only `review_events`
 *  log — batched once across every mastered term on the page rather than
 *  queried per row. `TraceCandidate.createdAt` looks tempting here but is
 *  the term's own creation date in `terms`, not when this user first saw
 *  it, so it can't stand in for this. */
async function fetchFirstSeenAtByTermId(
  client: Client,
  termIds: string[],
): Promise<Map<string, Date>> {
  if (termIds.length === 0) return new Map();

  const { data, error } = await client
    .from("review_events")
    .select("term_id, created_at")
    .in("term_id", termIds)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const firstSeenAtByTermId = new Map<string, Date>();
  for (const row of data) {
    if (!firstSeenAtByTermId.has(row.term_id)) {
      firstSeenAtByTermId.set(row.term_id, new Date(row.created_at));
    }
  }
  return firstSeenAtByTermId;
}

function tierFromLabel(label: KnownLabel): MasteryTier {
  if (label === "known") return "strong";
  if (label === "learning") return "medium";
  return "weak";
}

/** The doc §8 aggregate numbers plus a flat per-term list, for
 *  /jargon/mastery. Paused collections are excluded throughout. */
export async function loadMasteryOverview(
  client: Client,
  userId: string,
): Promise<MasteryOverviewData> {
  const { collectionRows, reviewDomainIds } = await resolveReviewDomainIds(client, userId);
  const activeSet = new Set(reviewDomainIds);
  const activeCollectionRows = collectionRows.filter((row) => activeSet.has(row.id));
  if (activeCollectionRows.length === 0) {
    return { collections: [], currentStrength: 0, termsLearned: 0, termRows: [] };
  }

  const collections: MasteryCollectionOption[] = activeCollectionRows
    .map((row) => ({ domainId: row.id, domainName: row.name }))
    .sort((a, b) => a.domainName.localeCompare(b.domainName));

  const candidates = await fetchActiveTraceCandidates(client, userId);
  const now = new Date();
  const startedCandidates = candidates.filter((c) => c.readCount > 0);
  const termsLearned = candidates.filter((c) => c.everMasteredAt !== null).length;

  const domainNameById = new Map(activeCollectionRows.map((row) => [row.id, row.name]));

  const termIds = candidates.map((c) => c.termId);
  const termInfoById = new Map<string, { term: string; category: string }>();
  if (termIds.length > 0) {
    const { data: termData, error } = await client
      .from("terms")
      .select("id, term, category")
      .in("id", termIds);
    if (error) throw error;
    for (const t of termData) termInfoById.set(t.id, { term: t.term, category: t.category });
  }

  const masteredTermIds = candidates.filter((c) => c.everMasteredAt !== null).map((c) => c.termId);
  const firstSeenAtByTermId = await fetchFirstSeenAtByTermId(client, masteredTermIds);

  const termRows: MasteryTermRow[] = candidates
    .flatMap((candidate) => {
      const info = termInfoById.get(candidate.termId);
      if (!info) return [];
      const snapshot = computeTraceSnapshot(candidate, now);

      let journey: MasteryTermJourney | null = null;
      if (candidate.everMasteredAt !== null) {
        const firstSeenAt = firstSeenAtByTermId.get(candidate.termId);
        if (firstSeenAt) {
          journey = {
            firstSeenAt: firstSeenAt.toISOString(),
            masteredAt: candidate.everMasteredAt.toISOString(),
            learnedInDays: Math.max(
              1,
              Math.round(daysBetween(firstSeenAt, candidate.everMasteredAt)),
            ),
          };
        }
      }

      return [
        {
          termId: candidate.termId,
          term: info.term,
          domainId: candidate.domainId,
          domainName: domainNameById.get(candidate.domainId) ?? "Unknown",
          category: info.category,
          score: Math.round(snapshot.masteryAdjusted * 100),
          tier: tierFromLabel(snapshot.knownLabel),
          known: snapshot.knownLabel === "known",
          journey,
        },
      ];
    })
    .sort((a, b) => b.score - a.score || a.term.localeCompare(b.term));

  return {
    collections,
    currentStrength: aggregateMastery(startedCandidates, now),
    termsLearned,
    termRows,
  };
}
