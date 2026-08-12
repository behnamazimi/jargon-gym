/** Display-only mastery tier. Never feeds back into score.ts.
 *
 *  Callers with insufficient own-context history (< FAIL_RATE_MIN_ATTEMPTS
 *  attempts) must pass failRate = 0 — lack of history isn't "historically
 *  hard".
 */

import { fieldsForContext } from "./score";
import type { PickContext, ReviewCandidate } from "./types";
import { FAIL_RATE_MIN_ATTEMPTS, WEIGHTS } from "./weights";

export type Strength = "weak" | "medium" | "strong";

export const STRENGTH_WEAK_FAIL_RATE = 0.4;
export const STRENGTH_STRONG_MIN_STREAK = 5;
export const STRENGTH_STRONG_MAX_FAIL_RATE = 0.15;

export function computeStrength(
  streak: number,
  failRate: number,
  hoursSinceLastActivity: number,
): Strength {
  if (streak <= 0 || failRate > STRENGTH_WEAK_FAIL_RATE) return "weak";
  if (
    streak >= STRENGTH_STRONG_MIN_STREAK &&
    failRate < STRENGTH_STRONG_MAX_FAIL_RATE &&
    hoursSinceLastActivity < WEIGHTS.stalenessCapHours
  ) {
    return "strong";
  }
  return "medium";
}

/** Strength for a candidate's own-context history — Read has no streak/fail
 *  concept of its own, so it returns undefined there. */
export function strengthForCandidate(
  candidate: ReviewCandidate,
  context: PickContext,
  now: Date,
): Strength | undefined {
  if (context === "read") return undefined;

  const fields = fieldsForContext(candidate, context);
  const totalFails = context === "review" ? candidate.reviewFailCount : candidate.quizFailCount;
  const failRate = fields.ownCount < FAIL_RATE_MIN_ATTEMPTS ? 0 : totalFails / fields.ownCount;
  const hoursSinceLastActivity = fields.lastActivityAt
    ? (now.getTime() - fields.lastActivityAt.getTime()) / (1000 * 60 * 60)
    : Infinity;

  return computeStrength(fields.streak ?? 0, failRate, hoursSinceLastActivity);
}
