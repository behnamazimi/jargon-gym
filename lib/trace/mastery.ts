/** §7 Mastery (per term, live) + §8 aggregate mastery + §9 known/unknown
 *  label. Nothing here is stored — always recomputed from current trace
 *  state and timestamps. */

import {
  CONFIDENCE_TIME_CONSTANT,
  KNOWN_MIN_TEST_COUNT,
  KNOWN_THRESHOLD,
  MASTERY_WEIGHT_FAMILIARITY,
  MASTERY_WEIGHT_RECALL,
  MASTERY_WEIGHT_RECOGNITION,
  UNKNOWN_THRESHOLD,
} from "./constants";
import type { KnownLabel } from "./types";

/** confidence(n) = 1 − e^(−n/τ) — discounts mastery on lightly-tested terms. */
export function confidence(testCount: number): number {
  return 1 - Math.exp(-testCount / CONFIDENCE_TIME_CONSTANT);
}

/** Mastery = wF·F_used + wR·R_r + wG·R_g. A track with no history yet
 *  (null retrievability, §4b/§5) contributes 0 rather than making the
 *  whole blend undefined — an unreviewed term's mastery is just whatever
 *  Read alone has earned it. */
export function blendMastery(input: {
  familiarityUsed: number;
  recallRetrievability: number | null;
  recognitionRetrievability: number | null;
}): number {
  return (
    MASTERY_WEIGHT_FAMILIARITY * input.familiarityUsed +
    MASTERY_WEIGHT_RECALL * (input.recallRetrievability ?? 0) +
    MASTERY_WEIGHT_RECOGNITION * (input.recognitionRetrievability ?? 0)
  );
}

/** Mastery_adjusted = confidence(n) · Mastery(term, t). `testCount` is the
 *  combined Review + Quiz test count — the two tracks that are actual
 *  tests, as opposed to Read's passive exposure. */
export function masteryAdjusted(mastery: number, testCount: number): number {
  return confidence(testCount) * mastery;
}

/** §9 known/unknown label — a plain two-threshold read of Mastery_adjusted,
 *  no hysteresis (see plan's deviation note: hysteresis needs memory of the
 *  previous label, which conflicts with "nothing stored, recompute live"). */
export function deriveKnownLabel(masteryAdj: number, testCount: number): KnownLabel {
  if (masteryAdj >= KNOWN_THRESHOLD && testCount >= KNOWN_MIN_TEST_COUNT) return "known";
  if (masteryAdj < UNKNOWN_THRESHOLD) return "unknown";
  return "learning";
}

/** §8 OverallMastery = (Σ Mastery_adjusted) / N_active. Caller passes only
 *  the adjusted-mastery values for N_active terms (≥1 Read) — this
 *  function just averages what it's given. */
export function aggregateMastery(perTermAdjusted: number[]): number {
  if (perTermAdjusted.length === 0) return 0;
  return perTermAdjusted.reduce((sum, value) => sum + value, 0) / perTermAdjusted.length;
}
