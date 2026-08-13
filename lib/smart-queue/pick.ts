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
  MIX_ALREADY_TOUCHED_SLOTS,
  MIX_NEVER_ENGAGED_SLOTS,
  QUEUE_TIMEZONE,
  WEIGHTS,
} from "./weights";
import type { PickContext, ReviewCandidate, ScoredCandidate } from "./types";

export function pickTerms(
  candidates: ReviewCandidate[],
  limit: number,
  context: PickContext,
): ScoredCandidate[] {
  if (candidates.length === 0 || limit <= 0) {
    return [];
  }

  const now = new Date();

  const scored: ScoredCandidate[] = candidates.map((candidate) => {
    const { score, reasons } = scoreCandidate(candidate, WEIGHTS, context, now);
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

  const mixed = mixLanes(scored, context, now);

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

type Lane = "never_engaged" | "already_touched";

/** A term sits out of a mix slot when a cooldown fired, or — read context
 *  only — it was already read today. Review/Quiz misses today stay
 *  eligible: there's no mastered cooldown to sit them out, and struggling
 *  terms should still be able to surface the same day. */
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
 *  `limit` slices will almost never reach them. */
function mixLanes(scored: ScoredCandidate[], context: PickContext, now: Date): ScoredCandidate[] {
  const neverEngaged: ScoredCandidate[] = [];
  const alreadyTouched: ScoredCandidate[] = [];
  const ineligible: ScoredCandidate[] = [];

  for (const candidate of scored) {
    if (!isEligibleForMix(candidate, context, now)) {
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
