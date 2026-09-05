import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveReviewDomainIds, resolveReviewDomainIdsForUser } from "@/lib/jargon/known-state";
import {
  fetchActiveTraceCandidates,
  getPoolStatsByDomainForUser,
  type PickContext,
  type TraceCandidate,
} from "@/lib/trace-queue";
import {
  aggregateMastery,
  CALIBRATION_MIN_BUCKET_SAMPLE,
  computeCrossingPace,
  computeTraceSnapshot,
  estimateMilestone,
  isSameLocalDay,
  partitionLiveMasteryBuckets,
  STUDY_TIMEZONE,
  summarizeGradeDistribution,
  type MasteryBucketCounts,
  type MilestoneEstimate,
  type ReviewGrade,
} from "@/lib/trace";
import type { CollectionDomainRow } from "./collections";

type Client = SupabaseClient<Database>;

export type CollectionStats = {
  id: string;
  name: string;
  isActive: boolean;
  knownCount: number;
  totalCount: number;
  percentage: number;
  unseen: number;
  seen: number;
};

export async function fetchCollectionStats(
  client: Client,
  userId: string,
  context: PickContext = "read",
): Promise<CollectionStats[]> {
  const { collectionRows, reviewDomainIds } = await resolveReviewDomainIdsForUser(client, userId);

  if (collectionRows.length === 0) return [];

  const activeSet = new Set(reviewDomainIds);
  const statsByDomain = await getPoolStatsByDomainForUser(client, userId, context);

  const stats: CollectionStats[] = collectionRows.map((row) => {
    const totalCount = row.termCount;
    const knownCount = row.knownCount;
    const percentage = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
    const queueStats = statsByDomain.get(row.id);

    return {
      id: row.id,
      name: row.name,
      isActive: activeSet.has(row.id),
      knownCount,
      totalCount,
      percentage,
      unseen: queueStats?.unseen ?? 0,
      seen: queueStats?.seen ?? 0,
    };
  });

  stats.sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return stats;
}

/** Rough "time to next milestone" insight, per collection — two
 *  independent estimates (never combined into one number, since the two
 *  transitions compete for the same study time). `buckets` and the
 *  `remaining` counts behind each estimate are live (a term can move
 *  backward through them as it decays), while each estimate's *rate* half
 *  stays anchored on the permanent ever_learning_at/ever_mastered_at
 *  high-water marks — there's no coherent "live rate" for a value with no
 *  stable crossing time. See lib/trace/pace.ts. */
export type CollectionPaceInsight = {
  buckets: MasteryBucketCounts;
  /** Time until the last "never reached Learning" term first gets there. */
  toLearning: MilestoneEstimate;
  /** Time until the current "reached Learning, not yet Mastered" terms clear. */
  toMastery: MilestoneEstimate;
};

export type CollectionStatBreakdown = {
  id: string;
  name: string;
  termsLearnedCount: number;
  totalCount: number;
  percentage: number;
  unseenCount: number;
  paceInsight: CollectionPaceInsight;
  /** §8 OverallMastery scoped to this collection's own started (≥1 Read)
   *  terms — the per-collection analogue of the page-wide aggregate, which
   *  blurred together collections at very different stages. */
  currentStrength: number;
};

/** The web Mastery page's overview: a rollup across active collections
 *  plus a per-collection unseen count. */
type StatsSnapshot = {
  activeCount: number;
  pausedCount: number;
  rollup: {
    read: { unseen: number };
    review: { unseen: number };
    quiz: { unseen: number };
  };
  activeCollections: CollectionStatBreakdown[];
};

function groupCandidatesByDomain(candidates: TraceCandidate[]): Map<string, TraceCandidate[]> {
  const byDomain = new Map<string, TraceCandidate[]>();
  for (const candidate of candidates) {
    const list = byDomain.get(candidate.domainId) ?? [];
    list.push(candidate);
    byDomain.set(candidate.domainId, list);
  }
  return byDomain;
}

const EMPTY_STATS_SNAPSHOT: StatsSnapshot = {
  activeCount: 0,
  pausedCount: 0,
  rollup: {
    read: { unseen: 0 },
    review: { unseen: 0 },
    quiz: { unseen: 0 },
  },
  activeCollections: [],
};

function countUnseen(candidates: TraceCandidate[], context: PickContext): number {
  const ownCount = (c: TraceCandidate) =>
    context === "read" ? c.readCount : context === "review" ? c.reviewRecallCount : c.quizTestCount;
  return candidates.filter((c) => ownCount(c) === 0).length;
}

/** Pure aggregation for the web snapshot fetcher below — one candidate
 *  fetch across all active collections (`domainIds: "all"`). */
function buildCollectionPaceInsight(
  candidates: TraceCandidate[],
  now: Date,
): CollectionPaceInsight {
  const labels = candidates.map((c) => computeTraceSnapshot(c, now).knownLabel);
  const buckets = partitionLiveMasteryBuckets(labels);
  const learningCrossings = candidates
    .map((c) => c.everLearningAt)
    .filter((d): d is Date => d !== null);
  const masteredCrossings = candidates
    .map((c) => c.everMasteredAt)
    .filter((d): d is Date => d !== null);

  return {
    buckets,
    toLearning: estimateMilestone(
      buckets.neverLearning,
      computeCrossingPace(learningCrossings, now),
    ),
    toMastery: estimateMilestone(
      buckets.learningNotMastered,
      computeCrossingPace(masteredCrossings, now),
    ),
  };
}

function buildStatsSnapshot(
  collectionRows: CollectionDomainRow[],
  reviewDomainIds: string[],
  candidates: TraceCandidate[],
  now: Date,
): StatsSnapshot {
  const activeSet = new Set(reviewDomainIds);
  const activeRows = collectionRows.filter((row) => activeSet.has(row.id));
  const pausedCount = collectionRows.length - activeRows.length;

  if (activeRows.length === 0) {
    return { ...EMPTY_STATS_SNAPSHOT, pausedCount };
  }

  const byDomain = groupCandidatesByDomain(candidates);

  const activeCollections: CollectionStatBreakdown[] = activeRows.map((row) => {
    const totalCount = row.termCount;
    const termsLearnedCount = row.termsLearnedCount;
    const percentage = totalCount > 0 ? Math.round((termsLearnedCount / totalCount) * 100) : 0;
    const domainCandidates = byDomain.get(row.id) ?? [];
    const startedDomainCandidates = domainCandidates.filter((c) => c.readCount > 0);

    return {
      id: row.id,
      name: row.name,
      termsLearnedCount,
      totalCount,
      percentage,
      unseenCount: countUnseen(domainCandidates, "read"),
      paceInsight: buildCollectionPaceInsight(domainCandidates, now),
      currentStrength: aggregateMastery(startedDomainCandidates, now),
    };
  });

  activeCollections.sort((a, b) => {
    if (a.unseenCount !== b.unseenCount) return b.unseenCount - a.unseenCount;
    return a.name.localeCompare(b.name);
  });

  return {
    activeCount: activeRows.length,
    pausedCount,
    rollup: {
      read: { unseen: countUnseen(candidates, "read") },
      review: { unseen: countUnseen(candidates, "review") },
      quiz: { unseen: countUnseen(candidates, "quiz") },
    },
    activeCollections,
  };
}

type PausedCollectionSummary = {
  id: string;
  name: string;
  termsLearnedCount: number;
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
  return { id: row.id, name: row.name, termsLearnedCount, totalCount, percentage };
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
