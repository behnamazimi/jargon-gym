/** Learning pace — a forward-looking projection over historical
 *  ever_mastered_at timestamps for one collection: how many terms per
 *  week a user has recently crossed the known threshold for, and how many
 *  weeks remain at that pace. Pure display math, feeds no scoring
 *  decision — the Mastery page's per-collection footnote is the only
 *  caller. */

const PACE_LOOKBACK_DAYS = 28;
const PACE_MIN_SAMPLES = 2;

/** Terms-per-week rate from how many terms crossed the known threshold in
 *  the last `lookbackDays` — null when there isn't enough recent history
 *  to trust a rate (fewer than `minSamples` in the window), so callers
 *  never have to show a "0/week" guess or divide by zero. */
export function computeRecentPacePerWeek(
  everMasteredAt: Array<Date | null>,
  now: Date,
  opts: { lookbackDays?: number; minSamples?: number } = {},
): number | null {
  const lookbackDays = opts.lookbackDays ?? PACE_LOOKBACK_DAYS;
  const minSamples = opts.minSamples ?? PACE_MIN_SAMPLES;
  const windowStart = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const countInWindow = everMasteredAt.filter(
    (at): at is Date => at !== null && at >= windowStart && at <= now,
  ).length;

  if (countInWindow < minSamples) return null;
  return countInWindow / (lookbackDays / 7);
}

/** Weeks left to finish a collection at a given pace — null when there's
 *  nothing left to learn or the pace couldn't be estimated. `remaining`
 *  (terms not yet mastered) is the caller's to compute, not this
 *  module's concern. */
export function estimateWeeksRemaining(remaining: number, perWeek: number | null): number | null {
  if (perWeek === null || perWeek <= 0 || remaining <= 0) return null;
  return Math.ceil(remaining / perWeek);
}
