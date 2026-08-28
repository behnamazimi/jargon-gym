/** Term selection from scored candidates.
 *
 *  Scoring ranks within a lane; picking interleaves two lanes — never-
 *  engaged and already-touched — proportionally to their own sizes, so a
 *  fresh dump of terms can't monopolize every slot in the queue and an
 *  ongoing rotation isn't permanently capped at a flat share either. See
 *  RANKING.mixMinLaneShare in weights.ts for the minimum-share floor.
 */

import { isSameLocalDay } from "./local-day";
import { fieldsForContext, scoreCandidate } from "./score";
import { masteredCooldownHours, RANKING } from "./weights";
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
    const { score, reasons } = scoreCandidate(candidate, RANKING.formula, context, now);
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

/** True when a term has no engagement history behind it at all — marked
 *  known by a plain toggle, never read or reviewed. Quiz exists to catch
 *  exactly this risk, so within tier 1 these sort ahead of terms that at
 *  least earned their known status through real study. */
function isUnverifiedByEngagement(candidate: ReviewCandidate): boolean {
  return candidate.readCount === 0 && candidate.reviewRecallCount === 0;
}

export type PickQuizTermsOptions = {
  /** Debug only: append same-day sit-outs (read-today, own-fail) after the
   *  three tiers instead of dropping them, mirroring pickTerms's debug mode. */
  includeSitOuts?: boolean;
};

/** Quiz's dedicated pick path: known pool only, hard priority tiers instead
 *  of a score mix. Never quizzed (zero read/review engagement first, then
 *  oldest known_at within each of those two groups) always precedes
 *  stale/remastered (score-ordered, no Review→Quiz cross-fail), which always
 *  precedes recently mastered (soonest cooldown expiry first) — no 1:1 mix
 *  like Review/Read. Zero-engagement terms sort first within tier 1 because
 *  they were marked known by a plain toggle with no read or review behind
 *  them — the actual false-known risk Quiz exists to catch, see
 *  isUnverifiedByEngagement. Same-day sit-outs (read today, own miss today)
 *  are dropped from live picks entirely, not just deprioritized;
 *  mastered_cooldown is not a sit-out here — it defines tier 3 membership
 *  instead. */
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
    const { score, reasons } = scoreCandidate(candidate, RANKING.formula, "quiz", now);
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

  const tier1Unverified: ScoredCandidate[] = [];
  const tier1Verified: ScoredCandidate[] = [];
  for (const candidate of tier1) {
    (isUnverifiedByEngagement(candidate) ? tier1Unverified : tier1Verified).push(candidate);
  }
  for (const group of [tier1Unverified, tier1Verified]) {
    group.sort((a, b) => (a.knownAt?.getTime() ?? 0) - (b.knownAt?.getTime() ?? 0));
    shuffleEqualKeyRuns(group, (c) => c.knownAt?.getTime() ?? 0);
  }
  const tier1Ordered = [...tier1Unverified, ...tier1Verified];

  tier2.sort((a, b) => b.score - a.score);
  shuffleEqualScoreRuns(tier2);

  tier3.sort((a, b) => masteredCooldownExpiryMs(a) - masteredCooldownExpiryMs(b));
  shuffleEqualKeyRuns(tier3, masteredCooldownExpiryMs);

  const ordered = [...tier1Ordered, ...tier2, ...tier3];
  const withSitOuts = options.includeSitOuts ? [...ordered, ...sitOut] : ordered;

  return withSitOuts.slice(0, limit);
}

/** Read's stale-known fallback: known pool only, plain deterministic sort
 *  by staleness — deliberately bypasses scoreCandidate/RANKING entirely,
 *  unlike every other pick function in this file. This only ever runs once
 *  the unknown pool has come up empty, so determinism (always resurface the
 *  term you've neglected longest) matters more than the lane-mix/decay
 *  variety pickTerms is built for. Oldest lastReadAt sorts first; a null
 *  lastReadAt (marked known via the manual toggle, never actually read)
 *  sorts ahead of everything, same "least engaged first" instinct as
 *  isUnverifiedByEngagement above. readCount ascending breaks ties. */
export function pickStaleKnownTerms(
  candidates: ReviewCandidate[],
  limit: number,
): ScoredCandidate[] {
  if (candidates.length === 0 || limit <= 0) {
    return [];
  }

  const sorted = [...candidates].sort((a, b) => {
    const aTime = a.lastReadAt?.getTime() ?? 0;
    const bTime = b.lastReadAt?.getTime() ?? 0;
    if (aTime !== bTime) return aTime - bTime;
    return a.readCount - b.readCount;
  });

  return sorted.slice(0, limit).map((candidate) => ({ ...candidate, score: 0, reasons: [] }));
}

/** Which pool a candidate came from — derived from `knownAt` rather than
 *  stored separately, since the repository already populates it correctly
 *  per-candidate regardless of which status was queried. */
export function originOf(candidate: ReviewCandidate): "known" | "unknown" {
  return candidate.knownAt !== null ? "known" : "unknown";
}

/** A lane's fractional "turn" position for proportional interleaving with a
 *  minimum-share floor: inflates the denominator to at least
 *  `totalLength * minShare` before dividing, so a lane far smaller than
 *  that share advances its turn more slowly than its true size would
 *  produce and gets picked more often than its true proportion — converging
 *  on roughly `minShare` of slots instead of being crowded to near-zero by
 *  an extreme size imbalance. Once `trueLength` already clears the floor
 *  threshold, effectiveLength === trueLength and this is identical to plain
 *  proportional turn (index / trueLength) — no floor effect. A zero-length
 *  lane always returns Infinity so it's never selected, matching
 *  interleaveProportional's own zero-length handling. */
function laneTurn(
  index: number,
  trueLength: number,
  totalLength: number,
  minShare: number,
): number {
  if (trueLength === 0) return Infinity;
  const effectiveLength = Math.max(trueLength, totalLength * minShare);
  return index / effectiveLength;
}

/** Interleaves two pre-sliced lists proportionally to their own lengths —
 *  not a fixed ratio — so results stay evenly spread even after backfill
 *  changes the effective known/unknown split for a session. Tracks each
 *  list's fractional "turn" position and always emits from whichever is
 *  further behind; once a list empties, the other simply drains alone. */
function interleaveProportional<T>(a: T[], b: T[]): T[] {
  const result: T[] = [];
  let ai = 0;
  let bi = 0;

  while (ai < a.length || bi < b.length) {
    const aTurn = a.length === 0 ? Infinity : ai / a.length;
    const bTurn = b.length === 0 ? Infinity : bi / b.length;

    if (aTurn <= bTurn) {
      if (ai < a.length) {
        result.push(a[ai]!);
        ai++;
      } else {
        result.push(b[bi]!);
        bi++;
      }
    } else {
      if (bi < b.length) {
        result.push(b[bi]!);
        bi++;
      } else {
        result.push(a[ai]!);
        ai++;
      }
    }
  }

  return result;
}

/** Review's mixed-pool pick: ranks the unknown and known pools independently
 *  (each through the ordinary {@link pickTerms}, so scoring/lane-mix/shuffle
 *  are fully reused and the two pools never compete on a shared scale), then
 *  interleaves them evenly at the RANKING.reviewMix ratio. If a pool can't
 *  fill its quota, the other pool backfills the shortfall so the session
 *  stays full length whenever any terms exist. Pass `limit = unknown.length
 *  + known.length` for debug/inspection (nothing sliced, nothing dropped). */
export function pickMixedReviewTerms(
  unknown: ReviewCandidate[],
  known: ReviewCandidate[],
  limit: number,
  context: PickContext,
  options: PickTermsOptions = {},
): ScoredCandidate[] {
  if (limit <= 0) return [];

  const { knownSlots, unknownSlots } = RANKING.reviewMix;
  const totalSlots = knownSlots + unknownSlots;

  let targetKnown = Math.round((limit * knownSlots) / totalSlots);
  let targetUnknown = limit - targetKnown;

  if (unknown.length < targetUnknown) {
    targetUnknown = unknown.length;
    targetKnown = Math.min(known.length, limit - targetUnknown);
  } else if (known.length < targetKnown) {
    targetKnown = known.length;
    targetUnknown = Math.min(unknown.length, limit - targetKnown);
  }

  const pickedUnknown = pickTerms(unknown, targetUnknown, context, options);
  const pickedKnown = pickTerms(known, targetKnown, context, options);

  return interleaveProportional(pickedUnknown, pickedKnown);
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
    isSameLocalDay(candidate.lastReadAt, now, RANKING.timezone)
  ) {
    return false;
  }
  return true;
}

/** Splits into never-engaged / already-touched lanes and interleaves them
 *  proportionally to their own sizes (RANKING.mixMinLaneShare guarantees a
 *  minimum share for whichever lane is smaller — see laneTurn). Ineligible
 *  (sat-out) terms are appended at the end, still score-ordered, so debug
 *  keeps listing every candidate while live `limit` slices will almost
 *  never reach them — except a Review/Quiz own-fail sit-out, which
 *  `includeOwnFailSitOut` can drop entirely instead of appending, so a
 *  short eligible pool can't leak it into a live batch. */
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

  const startLane = nextLane(
    scored,
    context,
    now,
    neverEngaged.length,
    alreadyTouched.length,
    RANKING.mixMinLaneShare,
  );
  const zipped = interleaveLanesWithFloor(
    neverEngaged,
    alreadyTouched,
    RANKING.mixMinLaneShare,
    startLane === "never_engaged",
  );

  return [...zipped, ...ineligible];
}

/** Which lane's turn is next, for a fresh no-persisted-state interleave.
 *  No last-lane flag is persisted, so — same reason this reconstruction
 *  exists — it rebuilds "how far each lane got today" from today's own-
 *  context engagements: ownCount === 1 with activity today means the last
 *  pick was that term's first (a never-engaged slot); ownCount > 1 with
 *  activity today means it was already touched before today (an already-
 *  touched slot). Feeds those today's-picks counts into the same laneTurn
 *  formula interleaveLanesWithFloor uses mid-zip, against the CURRENT
 *  eligible lane sizes, so repeated limit=1 calls (Read, Telegram) stay on
 *  the same floor-aware ratio a one-shot batch interleave would produce,
 *  without stored state. A tie (both exactly 0, the common case at the
 *  start of a fresh day) resolves to never-engaged, matching
 *  interleaveLanesWithFloor's own tie convention. */
function nextLane(
  scored: ScoredCandidate[],
  context: PickContext,
  now: Date,
  neverEngagedLength: number,
  alreadyTouchedLength: number,
  minShare: number,
): Lane {
  let neverEngagedPicksToday = 0;
  let alreadyTouchedPicksToday = 0;

  for (const candidate of scored) {
    const { ownCount, lastActivityAt } = fieldsForContext(candidate, context);
    // Read's staleness clock borrows lastReviewRecallAt (see fieldsForContext),
    // but lane reconstruction is "did you actually Read it today" — same
    // literal-timestamp rule as isEligibleForMix. A same-day Review must not
    // count as a Read lane pick.
    const engagementAt = context === "read" ? candidate.lastReadAt : lastActivityAt;
    if (!engagementAt || !isSameLocalDay(engagementAt, now, RANKING.timezone)) continue;
    if (ownCount === 1) neverEngagedPicksToday += 1;
    else if (ownCount > 1) alreadyTouchedPicksToday += 1;
  }

  const total = neverEngagedLength + alreadyTouchedLength;
  const neTurn = laneTurn(neverEngagedPicksToday, neverEngagedLength, total, minShare);
  const atTurn = laneTurn(alreadyTouchedPicksToday, alreadyTouchedLength, total, minShare);

  return neTurn <= atTurn ? "never_engaged" : "already_touched";
}

/** Floor-aware interleave of the never-engaged / already-touched lanes.
 *  Each pick emits from whichever lane laneTurn says is further behind;
 *  once a lane empties, its turn value can freeze below the other lane's
 *  (the floor's effectiveLength inflation means an exhausted small lane's
 *  turn caps below 1.0, not at 1.0 like plain proportional turn does) — so,
 *  like interleaveProportional, this always double-checks the intended
 *  lane still has items left and falls back to the other lane if not,
 *  rather than trusting the turn comparison alone once a lane is drained.
 *
 *  `preferNeverEngagedOnTie` breaks a tie (both turns equal — always true
 *  on the very first comparison of a fresh call, since mixLanes/pickTerms
 *  recompute the whole interleave from scratch with no persisted position;
 *  can recur later too, e.g. right as a floor-protected lane exhausts and
 *  its frozen turn briefly matches the other lane's climbing turn) as the
 *  tie-break for the whole loop, not just the first comparison — simpler
 *  than special-casing "first pick only," and correct either way since a
 *  later tie needs the same resolution. */
function interleaveLanesWithFloor(
  neverEngaged: ScoredCandidate[],
  alreadyTouched: ScoredCandidate[],
  minShare: number,
  preferNeverEngagedOnTie: boolean,
): ScoredCandidate[] {
  const result: ScoredCandidate[] = [];
  const total = neverEngaged.length + alreadyTouched.length;
  let ne = 0;
  let at = 0;

  while (ne < neverEngaged.length || at < alreadyTouched.length) {
    const neTurn = laneTurn(ne, neverEngaged.length, total, minShare);
    const atTurn = laneTurn(at, alreadyTouched.length, total, minShare);
    const favorNeverEngaged = neTurn === atTurn ? preferNeverEngagedOnTie : neTurn < atTurn;

    if (favorNeverEngaged) {
      if (ne < neverEngaged.length) {
        result.push(neverEngaged[ne]!);
        ne++;
      } else {
        result.push(alreadyTouched[at]!);
        at++;
      }
    } else {
      if (at < alreadyTouched.length) {
        result.push(alreadyTouched[at]!);
        at++;
      } else {
        result.push(neverEngaged[ne]!);
        ne++;
      }
    }
  }

  return result;
}
