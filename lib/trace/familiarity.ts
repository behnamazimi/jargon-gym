/** §3 Familiarity (F) — from Read.
 *
 *  Growth per read: F' = F + w_f · e^(−k·n), n = prior read count at the
 *  time of that read (0-indexed, so the first read always contributes the
 *  full w_f and each subsequent read contributes less).
 *
 *  That recursion telescopes into a closed form of `n` alone — this is the
 *  one place F itself isn't stored, only read_count/last_read_at (which
 *  already exist on review_state), so growth is recomputed from scratch
 *  every time rather than accumulated incrementally:
 *
 *    F_raw(n) = Σ_{i=0}^{n-1} w_f · e^(−k·i)
 *             = w_f · (1 − e^(−k·n)) / (1 − e^(−k))      [geometric series]
 */

import {
  FAMILIARITY_CAP,
  FAMILIARITY_DECAY_RATE,
  FAMILIARITY_DECAY_SCALE_DAYS,
  FAMILIARITY_GROWTH_RATE,
} from "./constants";
import { daysBetween, hyperbolicDecay } from "./decay";

/** Raw (undecayed) familiarity from read count alone — the closed-form sum above. */
export function rawFamiliarityGrowth(readCount: number): number {
  if (readCount <= 0) return 0;

  const ratio = Math.exp(-FAMILIARITY_DECAY_RATE);
  return (FAMILIARITY_GROWTH_RATE * (1 - ratio ** readCount)) / (1 - ratio);
}

/** Current familiarity: growth from read_count, decayed by days since last read. */
export function computeFamiliarity(readCount: number, lastReadAt: Date | null, now: Date): number {
  if (readCount <= 0 || lastReadAt === null) return 0;

  const raw = rawFamiliarityGrowth(readCount);
  const elapsedDays = daysBetween(lastReadAt, now);
  return hyperbolicDecay(raw, elapsedDays, FAMILIARITY_DECAY_SCALE_DAYS);
}

/** Familiarity's contribution to mastery is capped — Read alone can never
 *  push mastery above cap_F, no matter how high raw F grows. */
export function familiarityUsed(familiarity: number): number {
  return Math.min(familiarity, FAMILIARITY_CAP);
}
