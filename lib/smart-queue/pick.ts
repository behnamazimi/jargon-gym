/** Term selection from scored candidates.
 *
 *  Scoring ranks within a lane; picking interleaves two lanes — never-
 *  engaged and already-touched — so a fresh dump of terms can't monopolize
 *  every slot in the queue. See MIX_NEVER_ENGAGED_SLOTS / MIX_ALREADY_TOUCHED_SLOTS
 *  in weights.ts for the ratio.
 */

import { isSameLocalDay } from "./local-day";
import { fieldsForContext, scoreCandidate } from "./score";
import {
  masteredCooldownHours,
  MIX_ALREADY_TOUCHED_SLOTS,
  MIX_NEVER_ENGAGED_SLOTS,
  QUEUE_TIMEZONE,
  RANKING_WEIGHTS,
} from "./weights";
import type { PickContext, ReviewCandidate, ScoredCandidate } from "./types";

export type PickTermsOptions = {
  /** Debug only: keep own-activity fail sit-outs (Review/Quiz) in the returned
   *  list, appended after eligible terms like other sat-out reasons. Live
   *  picks default to false so a short eligible pool can't leak a same-day
   *  miss back into the batch. */
  includeOwnFailSitOut?: boolean;
};

export function pickTerms(
  candidates: ReviewCandidate[],
  limit: number,
  context: PickContext,
  options: PickTermsOptions = {},
): ScoredCandidate[] {
  if (candidates.length === 0 || limit <= 0) {
    return [];
  }

  const now = new Date();

  const scored: ScoredCandidate[] = candidates.map((candidate) => {
    const { score, reasons } = scoreCandidate(candidate, RANKING_WEIGHTS, context, now);
    return {
      ...candidate,
      score,
      reasons,
    };
  });

  // Score-desc, freshly random within equal scores so same-score terms from
  // different collections mix (stable fetch order used to clump by collection).
  scored.sort((a, b) => b.score - a.score);
  shuffleEqualScoreRuns(scored);

  const mixed = mixLanes(scored, context, now, options.includeOwnFailSitOut ?? false);

  return mixed.slice(0, limit);
}

/** Fisher–Yates within each contiguous equal-score run (already score-sorted). */
function shuffleEqualScoreRuns(scored: ScoredCandidate[]): void {
  let i = 0;
  while (i < scored.length) {
    let j = i + 1;
    while (j < scored.length && scored[j]!.score === scored[i]!.score) {
      j++;
    }
    shuffleRange(scored, i, j);
    i = j;
  }
}

function shuffleRange(arr: ScoredCandidate[], start: number, end: number): void {
  for (let i = end - 1; i > start; i--) {
    const j = start + Math.floor(Math.random() * (i - start + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

/** Fisher–Yates within each contiguous equal-key run (already key-sorted). */
function shuffleEqualKeyRuns(
  scored: ScoredCandidate[],
  keyOf: (c: ScoredCandidate) => number,
): void {
  let i = 0;
  while (i < scored.length) {
    let j = i + 1;
    while (j < scored.length && keyOf(scored[j]!) === keyOf(scored[i]!)) {
      j++;
    }
    shuffleRange(scored, i, j);
    i = j;
  }
}

/** Mastered-cooldown expiry (ms epoch): when this term's tier-3 window ends. */
function masteredCooldownExpiryMs(candidate: ScoredCandidate): number {
  const lastActivity = candidate.lastQuizTestedAt?.getTime() ?? 0;
  return lastActivity + masteredCooldownHours(candidate.quizStreak) * 60 * 60 * 1000;
}

export type QuizTier = "never_quizzed" | "not_quizzed_recently" | "recently_mastered";

/** Which hard tier a scored Quiz candidate belongs to — for grouping the
 *  setup preview (spec: "Preview grouped by the three tiers"). Mirrors the
 *  tier split inside {@link pickQuizTerms}. */
export function quizTierOf(candidate: ScoredCandidate): QuizTier {
  if (candidate.quizTestCount === 0) return "never_quizzed";
  if (candidate.reasons.includes("mastered_cooldown")) return "recently_mastered";
  return "not_quizzed_recently";
}

export type PickQuizTermsOptions = {
  /** Debug only: append same-day sit-outs (read-today, own-fail) after the
   *  three tiers instead of dropping them, mirroring pickTerms's debug mode. */
  includeSitOuts?: boolean;
};

/** Quiz's dedicated pick path: known pool only, hard priority tiers instead
 *  of a score mix. Never quizzed (oldest known_at first) always precedes
 *  stale/remastered (score-ordered, no Review→Quiz cross-fail), which always
 *  precedes recently mastered (soonest cooldown expiry first) — no 1:1 mix
 *  like Review/Read. Same-day sit-outs (read today, own miss today) are
 *  dropped from live picks entirely, not just deprioritized; mastered_cooldown
 *  is not a sit-out here — it defines tier 3 membership instead. */
export function pickQuizTerms(
  candidates: ReviewCandidate[],
  limit: number,
  options: PickQuizTermsOptions = {},
): ScoredCandidate[] {
  if (candidates.length === 0 || limit <= 0) {
    return [];
  }

  const now = new Date();

  const scored: ScoredCandidate[] = candidates.map((candidate) => {
    const { score, reasons } = scoreCandidate(candidate, RANKING_WEIGHTS, "quiz", now);
    return { ...candidate, score, reasons };
  });

  const eligible: ScoredCandidate[] = [];
  const sitOut: ScoredCandidate[] = [];

  for (const candidate of scored) {
    const isSitOut =
      candidate.reasons.includes("recent_read_cooldown") ||
      candidate.reasons.includes("recent_fail_cooldown");
    (isSitOut ? sitOut : eligible).push(candidate);
  }

  const tier1: ScoredCandidate[] = [];
  const tier2: ScoredCandidate[] = [];
  const tier3: ScoredCandidate[] = [];

  for (const candidate of eligible) {
    if (candidate.quizTestCount === 0) {
      tier1.push(candidate);
    } else if (candidate.reasons.includes("mastered_cooldown")) {
      tier3.push(candidate);
    } else {
      tier2.push(candidate);
    }
  }

  tier1.sort((a, b) => (a.knownAt?.getTime() ?? 0) - (b.knownAt?.getTime() ?? 0));
  shuffleEqualKeyRuns(tier1, (c) => c.knownAt?.getTime() ?? 0);

  tier2.sort((a, b) => b.score - a.score);
  shuffleEqualScoreRuns(tier2);

  tier3.sort((a, b) => masteredCooldownExpiryMs(a) - masteredCooldownExpiryMs(b));
  shuffleEqualKeyRuns(tier3, masteredCooldownExpiryMs);

  const ordered = [...tier1, ...tier2, ...tier3];
  const withSitOuts = options.includeSitOuts ? [...ordered, ...sitOut] : ordered;

  return withSitOuts.slice(0, limit);
}

type Lane = "never_engaged" | "already_touched";

/** A term sits out of a mix slot when a cooldown fired, or — read context
 *  only — it was already read today. This includes a Review/Quiz own-fail
 *  sit-out (`recent_fail_cooldown` in a non-read context): that same
 *  activity hard-sits the term out for the rest of the day. */
function isEligibleForMix(candidate: ScoredCandidate, context: PickContext, now: Date): boolean {
  if (
    candidate.reasons.includes("mastered_cooldown") ||
    candidate.reasons.includes("recent_read_cooldown") ||
    candidate.reasons.includes("recent_fail_cooldown")
  ) {
    return false;
  }
  if (
    context === "read" &&
    candidate.lastReadAt &&
    isSameLocalDay(candidate.lastReadAt, now, QUEUE_TIMEZONE)
  ) {
    return false;
  }
  return true;
}

/** Splits into never-engaged / already-touched lanes and zips them by the
 *  MIX_* slot ratio. Ineligible (sat-out) terms are appended at the end,
 *  still score-ordered, so debug keeps listing every candidate while live
 *  `limit` slices will almost never reach them — except a Review/Quiz
 *  own-fail sit-out, which `includeOwnFailSitOut` can drop entirely instead
 *  of appending, so a short eligible pool can't leak it into a live batch. */
function mixLanes(
  scored: ScoredCandidate[],
  context: PickContext,
  now: Date,
  includeOwnFailSitOut: boolean,
): ScoredCandidate[] {
  const neverEngaged: ScoredCandidate[] = [];
  const alreadyTouched: ScoredCandidate[] = [];
  const ineligible: ScoredCandidate[] = [];

  for (const candidate of scored) {
    if (!isEligibleForMix(candidate, context, now)) {
      const isOwnFailSitOut =
        context !== "read" && candidate.reasons.includes("recent_fail_cooldown");
      if (isOwnFailSitOut && !includeOwnFailSitOut) {
        continue;
      }
      ineligible.push(candidate);
      continue;
    }
    const { ownCount } = fieldsForContext(candidate, context);
    if (ownCount === 0) {
      neverEngaged.push(candidate);
    } else {
      alreadyTouched.push(candidate);
    }
  }

  const zipped = zipLanes(neverEngaged, alreadyTouched, startingLane(scored, context, now));

  return [...zipped, ...ineligible];
}

/** Which lane starts a fresh mix cycle. No last-lane flag is persisted, so
 *  this reconstructs it from today's own-context engagements: ownCount === 1
 *  with activity today means the last pick was that term's first (a
 *  never-engaged slot); ownCount > 1 with activity today means it was
 *  already touched before today (an already-touched slot). Starting with
 *  whichever lane is behind on its slot ratio keeps consecutive limit=1
 *  calls (Read, Telegram) on the ratio without stored state; a tie starts
 *  with never-engaged. */
function startingLane(scored: ScoredCandidate[], context: PickContext, now: Date): Lane {
  let neverEngagedPicksToday = 0;
  let alreadyTouchedPicksToday = 0;

  for (const candidate of scored) {
    const { ownCount, lastActivityAt } = fieldsForContext(candidate, context);
    if (!lastActivityAt || !isSameLocalDay(lastActivityAt, now, QUEUE_TIMEZONE)) continue;
    if (ownCount === 1) neverEngagedPicksToday += 1;
    else if (ownCount > 1) alreadyTouchedPicksToday += 1;
  }

  const neverEngagedCycles = neverEngagedPicksToday / MIX_NEVER_ENGAGED_SLOTS;
  const alreadyTouchedCycles = alreadyTouchedPicksToday / MIX_ALREADY_TOUCHED_SLOTS;

  return neverEngagedCycles > alreadyTouchedCycles ? "already_touched" : "never_engaged";
}

/** Interleaves the two lanes by MIX_NEVER_ENGAGED_SLOTS / MIX_ALREADY_TOUCHED_SLOTS,
 *  starting with `startLane`. Once a lane empties, each cycle contributes 0
 *  slots from it and the loop keeps draining the other lane alone — same
 *  end result as "the other lane fills the rest." */
function zipLanes(
  neverEngaged: ScoredCandidate[],
  alreadyTouched: ScoredCandidate[],
  startLane: Lane,
): ScoredCandidate[] {
  const result: ScoredCandidate[] = [];
  let ne = 0;
  let at = 0;

  const cycle: Array<{ lane: Lane; slots: number }> =
    startLane === "never_engaged"
      ? [
          { lane: "never_engaged", slots: MIX_NEVER_ENGAGED_SLOTS },
          { lane: "already_touched", slots: MIX_ALREADY_TOUCHED_SLOTS },
        ]
      : [
          { lane: "already_touched", slots: MIX_ALREADY_TOUCHED_SLOTS },
          { lane: "never_engaged", slots: MIX_NEVER_ENGAGED_SLOTS },
        ];

  while (ne < neverEngaged.length || at < alreadyTouched.length) {
    let progressed = false;
    for (const { lane, slots } of cycle) {
      for (let i = 0; i < slots; i++) {
        if (lane === "never_engaged" && ne < neverEngaged.length) {
          result.push(neverEngaged[ne]!);
          ne++;
          progressed = true;
        } else if (lane === "already_touched" && at < alreadyTouched.length) {
          result.push(alreadyTouched[at]!);
          at++;
          progressed = true;
        }
      }
    }
    if (!progressed) break;
  }

  return result;
}
