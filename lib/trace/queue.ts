/** §10 Per-tier queues — pure ranking, no due dates. Read always ranks the
 *  full candidate set. Review/Quiz also rank the full set — a term with no
 *  state yet for that track (§4b/§5's nullable state) has no real R(t), but
 *  it's still eligible: it's treated as maximally at risk (virtual R = -1,
 *  ahead of every real retrievability, which is always ≥ 0) so it surfaces
 *  first rather than being excluded. Excluding it instead would mean no
 *  term could ever receive its first grade — Review/Quiz would stay empty
 *  forever, since the only way a term gets real S_r/posterior is by being
 *  graded through this same queue. */

import {
  FAMILIARITY_DECAY_SCALE_DAYS,
  READ_TEMPER_WEIGHT,
  SESSION_COOLDOWN_RETRIEVABILITY,
} from "./constants";
import { daysBetween, hyperbolicDecay } from "./decay";
import { rawFamiliarityGrowth } from "./familiarity";
import { blendMastery, masteryAdjusted } from "./mastery";
import { retrievability as recallRetrievability } from "./recall";
import { posteriorToStability, retrievability as recognitionRetrievability } from "./recognition";
import type { TraceCandidate } from "./types";

/** Untested-track virtual retrievability — sorts ahead of every real R(t)
 *  (always in [0, 1]) without needing a separate "no state yet" branch in
 *  the sort/cooldown logic below. */
const UNTESTED_RETRIEVABILITY = -1;

/** Most recent of the three per-track "last touched" timestamps, or null
 *  if none has ever fired. */
function lastTouchedAt(c: TraceCandidate): Date | null {
  const dates = [c.lastReadAt, c.lastReviewRecallAt, c.lastQuizTestedAt].filter(
    (d): d is Date => d !== null,
  );
  return dates.length === 0 ? null : new Date(Math.max(...dates.map((d) => d.getTime())));
}

/** Decay-aware exposure across all three tiers — Read's primary ranking
 *  signal. Combines readCount + reviewRecallCount + quizTestCount into one
 *  count and runs it through the same curve shape computeFamiliarity uses
 *  for Read alone (rawFamiliarityGrowth decayed via hyperbolicDecay),
 *  anchored on whichever track was touched most recently. Deliberately a
 *  new function rather than a reuse of computeFamiliarity itself:
 *  computeFamiliarity stays Read-only (it still feeds the mastery blend
 *  and the Review cold-start nudge) — this one composes across tiers, so
 *  it lives here at the queue layer instead of in familiarity.ts. A term
 *  touched nowhere yet naturally returns 0, same as computeFamiliarity's
 *  own untouched case — no special-case branch needed. */
export function computeReadExposure(candidate: TraceCandidate, now: Date): number {
  const combinedCount = candidate.readCount + candidate.reviewRecallCount + candidate.quizTestCount;
  const touchedAt = lastTouchedAt(candidate);
  if (combinedCount <= 0 || touchedAt === null) return 0;

  const raw = rawFamiliarityGrowth(combinedCount);
  return hyperbolicDecay(raw, daysBetween(touchedAt, now), FAMILIARITY_DECAY_SCALE_DAYS);
}

/** Mastery-tempering nudge — how well-tested a term already is via
 *  Review/Quiz, added on top of computeReadExposure so a heavily-tested
 *  term sorts later in Read's queue even if its own read count is low.
 *  Familiarity is deliberately excluded from the blend (familiarityUsed:
 *  0) so this doesn't double-count the exposure signal above — it's
 *  purely "how well does recall/recognition say this term is known."
 *  Reuses the same recall/recognition retrievability derivation
 *  rankReviewQueue/rankQuizQueue use below. Naturally 0 for a completely
 *  untested term (masteryAdjusted multiplies by confidence(0) = 0). */
export function computeReadTempering(candidate: TraceCandidate, now: Date): number {
  const recallR =
    candidate.recallStability !== null
      ? recallRetrievability(
          candidate.recallStability,
          daysBetween(candidate.lastReviewRecallAt ?? now, now),
        )
      : null;
  const recognitionR =
    candidate.quizKnowledgePosterior !== null
      ? recognitionRetrievability(
          posteriorToStability(candidate.quizKnowledgePosterior),
          daysBetween(candidate.lastQuizTestedAt ?? now, now),
        )
      : null;

  const mastery = blendMastery({
    familiarityUsed: 0,
    recallRetrievability: recallR,
    recognitionRetrievability: recognitionR,
  });
  return masteryAdjusted(mastery, candidate.reviewRecallCount + candidate.quizTestCount);
}

/** Read: always eligible, ranked ascending by decay-aware cross-tier
 *  exposure plus a small mastery-tempering nudge (READ_TEMPER_WEIGHT) —
 *  see computeReadExposure/computeReadTempering above. Ties broken by
 *  oldest term first, so a freshly-added term doesn't jump the line ahead
 *  of one that's been sitting unread longer. */
export function rankReadQueue(candidates: TraceCandidate[], now: Date): TraceCandidate[] {
  return candidates
    .map((c) => ({
      candidate: c,
      score: computeReadExposure(c, now) + READ_TEMPER_WEIGHT * computeReadTempering(c, now),
    }))
    .sort(
      (a, b) =>
        a.score - b.score || a.candidate.createdAt.getTime() - b.candidate.createdAt.getTime(),
    )
    .map(({ candidate }) => candidate);
}

/** Review: every term is eligible. Ranked by R_r(t) ascending — most at
 *  risk of forgetting first, with never-graded terms ranked ahead of all
 *  of them — with same-session repeats excluded via the §6 cooldown
 *  (never-graded terms can't be a repeat, so the cooldown never touches
 *  them). Ties (including the untested tier) break by oldest term first. */
export function rankReviewQueue(candidates: TraceCandidate[], now: Date): TraceCandidate[] {
  return candidates
    .map((c) => ({
      candidate: c,
      r:
        c.recallStability !== null
          ? recallRetrievability(c.recallStability, daysBetween(c.lastReviewRecallAt ?? now, now))
          : UNTESTED_RETRIEVABILITY,
    }))
    .filter(({ r }) => r <= SESSION_COOLDOWN_RETRIEVABILITY)
    .sort((a, b) => a.r - b.r || a.candidate.createdAt.getTime() - b.candidate.createdAt.getTime())
    .map(({ candidate }) => candidate);
}

/** Quiz: every term is eligible, same shape as Review — ranked by R_g(t)
 *  ascending with never-answered terms ranked first, same cooldown rule. */
export function rankQuizQueue(candidates: TraceCandidate[], now: Date): TraceCandidate[] {
  return candidates
    .map((c) => ({
      candidate: c,
      r:
        c.quizKnowledgePosterior !== null
          ? recognitionRetrievability(
              posteriorToStability(c.quizKnowledgePosterior),
              daysBetween(c.lastQuizTestedAt ?? now, now),
            )
          : UNTESTED_RETRIEVABILITY,
    }))
    .filter(({ r }) => r <= SESSION_COOLDOWN_RETRIEVABILITY)
    .sort((a, b) => a.r - b.r || a.candidate.createdAt.getTime() - b.candidate.createdAt.getTime())
    .map(({ candidate }) => candidate);
}
