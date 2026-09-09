import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveReviewDomainIds } from "@/lib/jargon/known-state";
import {
  fetchActiveTraceCandidates,
  type PickContext,
  type TraceCandidate,
} from "@/lib/trace-queue";
import {
  CALIBRATION_MIN_BUCKET_SAMPLE,
  isSameLocalDay,
  STUDY_TIMEZONE,
  summarizeGradeDistribution,
  type ReviewGrade,
} from "@/lib/trace";
import type { CollectionDomainRow } from "./collections";
import {
  buildStatsSnapshot,
  EMPTY_STATS_SNAPSHOT,
  type StatsSnapshot,
} from "./collection-pace-insight";

export type { CollectionPaceInsight, CollectionStatBreakdown } from "./collection-pace-insight";

type Client = SupabaseClient<Database>;

type PausedCollectionSummary = {
  id: string;
  name: string;
  termsLearnedCount: number;
  markedKnownCount: number;
  totalCount: number;
  percentage: number;
};

/** Plain lifetime volume — not accuracy. The old pass/fail counters that
 *  backed a lifetime *accuracy* stat were retired with the streak-based
 *  scoring signals (deprecated, no longer written by
 *  record_review_event); TRACE's live retrievability is the closer
 *  analogue for "how good am I doing" and is what the Mastery page's
 *  headline numbers already use instead (see lib/jargon/mastery.ts). This
 *  is a different, narrower thing: just a running count of exposure, no
 *  right/wrong dimension at all. */
export type LifetimeTotals = {
  reviews: number;
  quizAnswers: number;
  termsRead: number;
};

function sumLifetimeTotals(candidates: TraceCandidate[]): LifetimeTotals {
  return candidates.reduce(
    (totals, c) => ({
      reviews: totals.reviews + c.reviewRecallCount,
      quizAnswers: totals.quizAnswers + c.quizTestCount,
      termsRead: totals.termsRead + c.readCount,
    }),
    { reviews: 0, quizAnswers: 0, termsRead: 0 },
  );
}

export type GradeDistributionSummary = {
  counts: Record<ReviewGrade, number>;
  total: number;
};

/** Grade-usage breakdown for the Mastery overview — how often each FSRS-5
 *  grade gets used across this user's own review_pass/fail history,
 *  purely descriptive (no "you're too generous" framing). Fetched
 *  up front alongside the rest of the snapshot (not lazily on expand) so
 *  the overview never re-flows once the panel opens. A narrower sibling
 *  of the debug page's getCalibrationSummaryAction: same underlying
 *  summarizeGradeDistribution, but only the counts a user should see, not
 *  the debug-only calibration/attention fields. Null below
 *  CALIBRATION_MIN_BUCKET_SAMPLE total gradings — same "not enough data
 *  yet" bar the debug page's own buckets use. */
async function fetchGradeDistribution(client: Client): Promise<GradeDistributionSummary | null> {
  const { data, error } = await client
    .from("review_events")
    .select("grade")
    .in("event", ["review_pass", "review_fail"]);
  if (error) throw error;

  const counts = summarizeGradeDistribution(data);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (total < CALIBRATION_MIN_BUCKET_SAMPLE) return null;

  return { counts, total };
}

/** Adds momentum (today) on top of the base `StatsSnapshot`. */
export type WebStatsSnapshot = StatsSnapshot & {
  today: { read: number; review: number; quiz: number };
  pausedCollections: PausedCollectionSummary[];
  lifetimeTotals: LifetimeTotals;
  gradeDistribution: GradeDistributionSummary | null;
};

function lastActivityAtForContext(candidate: TraceCandidate, context: PickContext): Date | null {
  switch (context) {
    case "read":
      return candidate.lastReadAt;
    case "review":
      return candidate.lastReviewRecallAt;
    case "quiz":
      return candidate.lastQuizTestedAt;
  }
}

function countActivityToday(candidates: TraceCandidate[], context: PickContext, now: Date): number {
  return candidates.filter((candidate) => {
    const lastActivityAt = lastActivityAtForContext(candidate, context);
    return lastActivityAt !== null && isSameLocalDay(lastActivityAt, now, STUDY_TIMEZONE);
  }).length;
}

function toPausedCollectionSummary(row: CollectionDomainRow): PausedCollectionSummary {
  const totalCount = row.termCount;
  const termsLearnedCount = row.termsLearnedCount;
  const percentage = totalCount > 0 ? Math.round((termsLearnedCount / totalCount) * 100) : 0;
  return {
    id: row.id,
    name: row.name,
    termsLearnedCount,
    markedKnownCount: row.markedKnownCount,
    totalCount,
    percentage,
  };
}

const EMPTY_WEB_STATS_SNAPSHOT: WebStatsSnapshot = {
  ...EMPTY_STATS_SNAPSHOT,
  today: { read: 0, review: 0, quiz: 0 },
  pausedCollections: [],
  lifetimeTotals: { reviews: 0, quizAnswers: 0, termsRead: 0 },
  gradeDistribution: null,
};

/** Web `/jargon/mastery`: session-scoped client, RLS via `auth.uid()`. Layers
 *  momentum (today) numbers on top of the base snapshot. */
export async function fetchStatsSnapshot(
  client: Client,
  userId: string,
): Promise<WebStatsSnapshot> {
  const { collectionRows, reviewDomainIds } = await resolveReviewDomainIds(client, userId);
  if (collectionRows.length === 0) return EMPTY_WEB_STATS_SNAPSHOT;

  const [candidates, gradeDistribution] = await Promise.all([
    fetchActiveTraceCandidates(client, userId),
    fetchGradeDistribution(client),
  ]);

  const now = new Date();
  const base = buildStatsSnapshot(collectionRows, reviewDomainIds, candidates, now);
  const activeSet = new Set(reviewDomainIds);
  const pausedCollections = collectionRows
    .filter((row) => !activeSet.has(row.id))
    .map(toPausedCollectionSummary)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ...base,
    today: {
      read: countActivityToday(candidates, "read", now),
      review: countActivityToday(candidates, "review", now),
      quiz: countActivityToday(candidates, "quiz", now),
    },
    pausedCollections,
    lifetimeTotals: sumLifetimeTotals(candidates),
    gradeDistribution,
  };
}
