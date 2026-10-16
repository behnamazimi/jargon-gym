/** §7 Mastery (per term, live) + §8 aggregate mastery + §9 known/unknown
 *  label. Nothing here is stored — always recomputed from current trace
 *  state and timestamps. */

import {
  CONFIDENCE_TIME_CONSTANT,
  KNOWN_MIN_TEST_COUNT,
  KNOWN_THRESHOLD,
  MASTERY_HORIZON_DAYS,
  MASTERY_WEIGHT_RECALL,
  MASTERY_WEIGHT_RECOGNITION,
  READ_GAP_WEIGHT,
  UNKNOWN_THRESHOLD,
  UNTESTED_TRACK_EVIDENCE,
} from "./constants";
import { addDays, daysBetween } from "./decay";
import { computeFamiliarity, familiarityUsed } from "./familiarity";
import { retrievability as recallRetrievability } from "./recall";
import { posteriorToStability, retrievability as recognitionRetrievability } from "./recognition";
import type { KnownLabel, TraceState } from "./types";

/** confidence(n) = 1 − e^(−n/τ) — discounts mastery on lightly-tested terms. */
export function confidence(testCount: number): number {
  return 1 - Math.exp(-testCount / CONFIDENCE_TIME_CONSTANT);
}

/** Mastery = R'^wR · K_g^wG, a weighted geometric mean of recall
 *  retrievability and recognition knowledge (quiz posterior × recognition
 *  retrievability), both read MASTERY_HORIZON_DAYS ahead by the caller, so
 *  the weaker track pulls mastery down. Reading fills part of what recall is
 *  missing: R' = R_r + w·F_used·(1 − R_r). A track with no history yet counts
 *  as UNTESTED_TRACK_EVIDENCE. A term with neither track tested has no
 *  mastery, whatever Read has done. */
export function blendMastery(input: {
  familiarityUsed: number;
  recallRetrievability: number | null;
  recognitionKnowledge: number | null;
}): number {
  if (input.recallRetrievability === null && input.recognitionKnowledge === null) return 0;

  const recall = input.recallRetrievability ?? UNTESTED_TRACK_EVIDENCE;
  const recallWithReading = recall + READ_GAP_WEIGHT * input.familiarityUsed * (1 - recall);
  return (
    recallWithReading ** MASTERY_WEIGHT_RECALL *
    (input.recognitionKnowledge ?? UNTESTED_TRACK_EVIDENCE) ** MASTERY_WEIGHT_RECOGNITION
  );
}

/** Recall retrievability at `at`, or null for a term never graded. */
export function recallRetrievabilityAt(
  state: Pick<TraceState, "recallStability" | "lastReviewRecallAt">,
  at: Date,
): number | null {
  return state.recallStability !== null
    ? recallRetrievability(state.recallStability, daysBetween(state.lastReviewRecallAt ?? at, at))
    : null;
}

/** Raw mastery, with every track read MASTERY_HORIZON_DAYS after `now`.
 *  `withReading: false` leaves Read out, for Read's own queue tempering. */
export function masteryAhead(state: TraceState, now: Date, withReading = true): number {
  const ahead = addDays(now, MASTERY_HORIZON_DAYS);
  const recognitionKnowledge =
    state.quizKnowledgePosterior !== null
      ? state.quizKnowledgePosterior *
        recognitionRetrievability(
          posteriorToStability(state.quizKnowledgePosterior),
          daysBetween(state.lastQuizTestedAt ?? now, ahead),
        )
      : null;
  return blendMastery({
    familiarityUsed: withReading
      ? familiarityUsed(computeFamiliarity(state.readCount, state.lastReadAt, ahead))
      : 0,
    recallRetrievability: recallRetrievabilityAt(state, ahead),
    recognitionKnowledge,
  });
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

/** Which permanent high-water marks (`ever_mastered_at`, `ever_learning_at`)
 *  an event may stamp. A miss never stamps: right after any answer the graded
 *  track's retrievability is 1, so the post-event label would otherwise credit
 *  a Review Again or a missed Quiz question as fresh memory. */
export function crossedThresholds(
  label: KnownLabel,
  succeeded: boolean,
): { known: boolean; learning: boolean } {
  if (!succeeded) return { known: false, learning: false };
  return { known: label === "known", learning: label !== "unknown" };
}

/** §8 OverallMastery = (Σ Mastery_adjusted) / N_active. Caller passes only
 *  the adjusted-mastery values for N_active terms (≥1 Read) — this
 *  function just averages what it's given. */
export function aggregateMastery(perTermAdjusted: number[]): number {
  if (perTermAdjusted.length === 0) return 0;
  return perTermAdjusted.reduce((sum, value) => sum + value, 0) / perTermAdjusted.length;
}
