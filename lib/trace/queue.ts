/** §10 Per-tier queues — pure ranking, no due dates. Read always ranks the
 *  full candidate set. Review/Quiz also rank the full set — a term with no
 *  state yet for that track (§4b/§5's nullable state) has no real R(t), but
 *  it's still eligible: it's treated as maximally at risk (virtual R = -1,
 *  ahead of every real retrievability, which is always ≥ 0) so it surfaces
 *  first rather than being excluded. Excluding it instead would mean no
 *  term could ever receive its first grade — Review/Quiz would stay empty
 *  forever, since the only way a term gets real S_r/posterior is by being
 *  graded through this same queue. */

import { SESSION_COOLDOWN_RETRIEVABILITY } from "./constants";
import { daysBetween } from "./decay";
import { retrievability as recallRetrievability } from "./recall";
import { posteriorToStability, retrievability as recognitionRetrievability } from "./recognition";
import type { TraceCandidate } from "./types";

/** Untested-track virtual retrievability — sorts ahead of every real R(t)
 *  (always in [0, 1]) without needing a separate "no state yet" branch in
 *  the sort/cooldown logic below. */
const UNTESTED_RETRIEVABILITY = -1;

/** Read: always eligible, ranked by lowest exposure first (ties broken by
 *  oldest term first, so a freshly-added term doesn't jump the line ahead
 *  of one that's been sitting unread longer). */
export function rankReadQueue(candidates: TraceCandidate[]): TraceCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.readCount !== b.readCount) return a.readCount - b.readCount;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
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
