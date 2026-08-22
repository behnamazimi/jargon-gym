/** Rotation-capacity diagnostics — debug page only, never fed back into
 *  scoring. Explains *why* a pool is taking as long as it is to cycle back
 *  around, using only the pool's current snapshot (own count / last-activity
 *  / streak per candidate) — there's no event log to compute a true
 *  historical rate from, so "recent daily rate" is approximated as the
 *  count of candidates whose own last-activity falls in the last 7 days,
 *  divided by 7. That's not an approximation for the one thing it's used
 *  for, though: keeping N terms each refreshed at least once every W days
 *  requires throughput >= N/W distinct-term-touches/day, so "distinct terms
 *  touched in the last 7 days" is exactly the right measure for a 7-day
 *  freshness bound — a first-time touch and a repeat touch both remove a
 *  term from the stale bucket equally. See docs/smart-queue.md's staleness
 *  cap (RANKING.formula.stalenessCapHours) for why 7 days is the relevant
 *  window: past it, a second, smaller boost (`stalenessTailMaxBoost`) keeps
 *  separating candidates by genuine wait time out to weeks of neglect — a
 *  week-stale term and a month-stale term no longer score identically,
 *  though terms within a similar wait-time band still land close enough to
 *  shuffle together.
 */

import { originOf } from "./pick";
import { fieldsForContext } from "./score";
import type { PickContext, ScoredCandidate } from "./types";
import { RANKING } from "./weights";

const RECENT_WINDOW_DAYS = 7;

export type RotationPoolInsight = {
  poolLabel: string;
  poolSize: number;
  /** Own-context count === 0 — never touched by this activity yet. */
  neverTouchedCount: number;
  /** poolSize - neverTouchedCount: eligible for the rotation lane. */
  rotationPoolSize: number;
  /** Own-context activity >= stalenessCapHours (7 days) old — past the base
   *  curve's cap, where a second, smaller boost still spreads pick order by
   *  roughly how much longer each term has waited, though terms with close
   *  wait times still land close enough to shuffle together. */
  staleCapCount: number;
  /** Own-context streak < 0 — always 0 for "read", which has no streak. */
  strugglingCount: number;
  /** Distinct terms with own-context activity in the last 7 days, / 7. */
  recentDailyRate: number;
  /** rotationPoolSize / recentDailyRate — null when there's no recent activity to project from. */
  projectedCycleDays: number | null;
  /** recentDailyRate * 7 — the rotation pool size current pace can keep inside the 7-day window. */
  safePoolSize: number | null;
  overSafeLine: boolean;
  suggestions: string[];
};

type PoolItem = {
  ownCount: number;
  lastActivityAt: Date | null;
  streak: number | null;
};

export type RawStats = Omit<RotationPoolInsight, "poolLabel" | "suggestions">;

export function poolRotationStats(items: PoolItem[], now: Date): RawStats {
  const capHours = RANKING.formula.stalenessCapHours;
  const windowMs = RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  let neverTouched = 0;
  let staleCap = 0;
  let struggling = 0;
  let touchedInWindow = 0;

  for (const item of items) {
    if (item.ownCount === 0) {
      neverTouched++;
      continue;
    }
    if (item.streak !== null && item.streak < 0) struggling++;
    if (item.lastActivityAt) {
      const ageMs = now.getTime() - item.lastActivityAt.getTime();
      if (ageMs / (1000 * 60 * 60) >= capHours) staleCap++;
      if (ageMs <= windowMs) touchedInWindow++;
    }
  }

  const poolSize = items.length;
  const rotationPoolSize = poolSize - neverTouched;
  const recentDailyRate = touchedInWindow / RECENT_WINDOW_DAYS;
  const projectedCycleDays = recentDailyRate > 0 ? rotationPoolSize / recentDailyRate : null;
  const safePoolSize = recentDailyRate > 0 ? recentDailyRate * RECENT_WINDOW_DAYS : null;
  const overSafeLine = safePoolSize !== null && rotationPoolSize > safePoolSize;

  return {
    poolSize,
    neverTouchedCount: neverTouched,
    rotationPoolSize,
    staleCapCount: staleCap,
    strugglingCount: struggling,
    recentDailyRate,
    projectedCycleDays,
    safePoolSize,
    overSafeLine,
  };
}

function plural(n: number): string {
  return n === 1 ? "" : "s";
}

function formatRate(rate: number): string {
  return rate >= 1 ? rate.toFixed(1) : rate.toFixed(2);
}

function formatDays(days: number): string {
  if (!Number.isFinite(days)) return "a very long time";
  if (days < 1) return "less than a day";
  const rounded = Math.round(days);
  return `${rounded} day${rounded === 1 ? "" : "s"}`;
}

function buildSuggestions(
  stats: RawStats,
  poolLabel: string,
  activityVerb: string,
  options: { hardBlocking?: boolean } = {},
): string[] {
  const suggestions: string[] = [];

  if (stats.neverTouchedCount > 0) {
    const pace =
      stats.recentDailyRate > 0
        ? ` — at the recent pace (~${formatRate(stats.recentDailyRate)}/day), that backlog clears in about ${formatDays(stats.neverTouchedCount / stats.recentDailyRate)}`
        : "";
    const blockingNote = options.hardBlocking
      ? " Quiz always finishes this backlog before any remastered term gets a slot, so nothing else in this pool moves until it's gone."
      : "";
    suggestions.push(
      `${stats.neverTouchedCount} term${plural(stats.neverTouchedCount)} here ${stats.neverTouchedCount === 1 ? "has" : "have"} never been ${activityVerb}${pace}.${blockingNote}`,
    );
  }

  if (stats.overSafeLine && stats.safePoolSize !== null) {
    const safe = Math.round(stats.safePoolSize);
    const overflow = stats.rotationPoolSize - safe;
    suggestions.push(
      `${poolLabel} has ${stats.rotationPoolSize} terms in rotation, but the recent pace only keeps about ${safe} of them inside the 7-day staleness window. The other ${overflow} cycle through the tail past the 7-day cap, where a smaller boost still favors longer waits but doesn't fully restore oldest-first ordering. Increase daily volume, pause a collection, or narrow the filter to bring this under ~${safe} terms.`,
    );
  } else if (stats.staleCapCount > 0) {
    suggestions.push(
      `${stats.staleCapCount} term${plural(stats.staleCapCount)} ${stats.staleCapCount === 1 ? "hasn't" : "haven't"} been ${activityVerb} in 7+ days — these still get a small extra nudge the longer they've waited, but it flattens out well before it fully restores oldest-first ordering.`,
    );
  }

  if (stats.strugglingCount > 0) {
    suggestions.push(
      `${stats.strugglingCount} struggling term${plural(stats.strugglingCount)} in ${poolLabel} will keep outranking merely-stale ones until ${stats.strugglingCount === 1 ? "it recovers" : "they recover"}, slowing the rest of this pool's rotation further.`,
    );
  }

  if (suggestions.length === 0 && stats.poolSize > 0) {
    suggestions.push(`${poolLabel} is cycling within a healthy window at the recent pace.`);
  }

  return suggestions;
}

function toPoolItems(candidates: ScoredCandidate[], context: PickContext): PoolItem[] {
  return candidates.map((c) => fieldsForContext(c, context));
}

function buildInsight(
  items: PoolItem[],
  poolLabel: string,
  activityVerb: string,
  now: Date,
  options: { hardBlocking?: boolean } = {},
): RotationPoolInsight {
  const stats = poolRotationStats(items, now);
  return {
    poolLabel,
    ...stats,
    suggestions: buildSuggestions(stats, poolLabel, activityVerb, options),
  };
}

/** Read is always the unknown pool. */
function buildReadRotationInsight(
  unknownCandidates: ScoredCandidate[],
  now: Date,
): RotationPoolInsight[] {
  return [
    buildInsight(toPoolItems(unknownCandidates, "read"), "Read queue (unknown pool)", "read", now),
  ];
}

/** Review blends known + unknown — report each pool separately since they
 *  compete for different slot budgets (RANKING.reviewMix), not a shared one. */
function buildReviewRotationInsight(
  candidates: ScoredCandidate[],
  now: Date,
): RotationPoolInsight[] {
  const unknown = candidates.filter((c) => originOf(c) === "unknown");
  const known = candidates.filter((c) => originOf(c) === "known");
  return [
    buildInsight(toPoolItems(unknown, "review"), "Review — unknown pool", "reviewed", now),
    buildInsight(toPoolItems(known, "review"), "Review — known pool", "reviewed", now),
  ];
}

/** Quiz is always the known pool, and its never-quizzed tier hard-blocks
 *  the rest (see pickQuizTerms) — flagged via hardBlocking. */
function buildQuizRotationInsight(
  knownCandidates: ScoredCandidate[],
  now: Date,
): RotationPoolInsight[] {
  return [
    buildInsight(toPoolItems(knownCandidates, "quiz"), "Quiz (known pool)", "quizzed", now, {
      hardBlocking: true,
    }),
  ];
}

export function buildRotationInsight(
  candidates: ScoredCandidate[],
  context: PickContext,
  now: Date = new Date(),
): RotationPoolInsight[] {
  switch (context) {
    case "read":
      return buildReadRotationInsight(candidates, now);
    case "review":
      return buildReviewRotationInsight(candidates, now);
    case "quiz":
      return buildQuizRotationInsight(candidates, now);
  }
}
