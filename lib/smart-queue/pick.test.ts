import { describe, expect, it } from "vitest";
import { pickTerms } from "./pick";
import { RANKING } from "./weights";
import type { ReviewCandidate, ScoredCandidate } from "./types";

const HOUR = 60 * 60 * 1000;
const MIN_SHARE = RANKING.mixMinLaneShare; // 0.1

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * HOUR);
}

/** Never-engaged: no review history at all. */
function makeNeverEngaged(termId: string): ReviewCandidate {
  return {
    termId,
    domainId: "d1",
    createdAt: hoursAgo(10000),
    readCount: 0,
    lastReadAt: null,
    reviewRecallCount: 0,
    lastReviewRecallAt: null,
    reviewStreak: 0,
    quizTestCount: 0,
    lastQuizTestedAt: null,
    quizStreak: 0,
    pendingReveal: false,
    lastFailAt: null,
    lastFailSource: null,
    reviewFailCount: 0,
    quizFailCount: 0,
    knownAt: null,
  };
}

/** Already-touched: one clean pass, well past its 72h mastered-cooldown
 *  window (default 200h ago) so it stays eligible for the mix. Positive
 *  streak avoids the negative-streak same-day own-fail sit-out entirely,
 *  so the only sit-out this fixture can ever hit is mastered_cooldown —
 *  useful for the "picked today" simulations below, where that's exactly
 *  the realistic behavior being relied on (a term picked today sits out
 *  of the mix afterward). */
function makeAlreadyTouched(termId: string, hoursSinceActivity = 200): ReviewCandidate {
  return {
    termId,
    domainId: "d1",
    createdAt: hoursAgo(10000),
    readCount: 0,
    lastReadAt: null,
    reviewRecallCount: 2,
    lastReviewRecallAt: hoursAgo(hoursSinceActivity),
    reviewStreak: 1,
    quizTestCount: 0,
    lastQuizTestedAt: null,
    quizStreak: 0,
    pendingReveal: false,
    lastFailAt: null,
    lastFailSource: null,
    reviewFailCount: 0,
    quizFailCount: 0,
    knownAt: null,
  };
}

type LaneTag = "NE" | "AT";

function tagOf(candidate: ScoredCandidate): LaneTag {
  return candidate.reviewRecallCount === 0 ? "NE" : "AT";
}

/** Oracle: a direct reimplementation of laneTurn + interleaveLanesWithFloor's
 *  algorithm, operating purely on lane sizes — used to precisely predict the
 *  lane-membership sequence a real pickTerms full-drain should produce,
 *  independent of which specific candidate ends up in which slot (same-lane
 *  candidates are score-identical in every test below, so only lane
 *  membership — not candidate identity — is meaningful to compare). */
function predictLaneSequence(
  neCount: number,
  atCount: number,
  minShare: number,
  preferNeOnTie: boolean,
): LaneTag[] {
  const total = neCount + atCount;
  const turn = (index: number, trueLength: number) =>
    trueLength === 0 ? Infinity : index / Math.max(trueLength, total * minShare);

  const seq: LaneTag[] = [];
  let ne = 0;
  let at = 0;

  while (ne < neCount || at < atCount) {
    const neTurn = turn(ne, neCount);
    const atTurn = turn(at, atCount);
    const favorNe = neTurn === atTurn ? preferNeOnTie : neTurn < atTurn;

    if (favorNe) {
      if (ne < neCount) {
        seq.push("NE");
        ne++;
      } else {
        seq.push("AT");
        at++;
      }
    } else {
      if (at < atCount) {
        seq.push("AT");
        at++;
      } else {
        seq.push("NE");
        ne++;
      }
    }
  }

  return seq;
}

function fullDrainTags(neCount: number, atCount: number): LaneTag[] {
  const candidates: ReviewCandidate[] = [
    ...Array.from({ length: neCount }, (_, i) => makeNeverEngaged(`ne-${i}`)),
    ...Array.from({ length: atCount }, (_, i) => makeAlreadyTouched(`at-${i}`)),
  ];
  const result = pickTerms(candidates, candidates.length, "review");
  return result.map(tagOf);
}

describe("proportional lane mix", () => {
  it("moderate imbalance (60 already-touched / 40 never-engaged) matches the proportional oracle exactly", () => {
    const actual = fullDrainTags(40, 60);
    const expected = predictLaneSequence(40, 60, MIN_SHARE, true);
    expect(actual).toEqual(expected);

    // No floor effect here (both lanes well above the 10-item floor
    // threshold for a 100-total pool) — confirm it's genuinely
    // proportional, not the old flat 1:1: never-engaged's share in the
    // first 20 picks should track ~40%, not 50%.
    const neInFirst20 = actual.slice(0, 20).filter((tag) => tag === "NE").length;
    expect(neInFirst20).toBeLessThanOrEqual(9);
    expect(neInFirst20).toBeGreaterThanOrEqual(6);
  });

  it("extreme imbalance (10 already-touched / 190 never-engaged) matches the floor-aware oracle exactly", () => {
    const actual = fullDrainTags(190, 10);
    const expected = predictLaneSequence(190, 10, MIN_SHARE, true);
    expect(actual).toEqual(expected);

    // The floor should pull already-touched's share toward ~10%, well
    // above its true ~5% share — count its occurrences in the first 100
    // picks (half the pool) as a plain, readable check alongside the
    // exact sequence match above.
    const atInFirst100 = actual.slice(0, 100).filter((tag) => tag === "AT").length;
    expect(atInFirst100).toBeGreaterThanOrEqual(7);
    expect(atInFirst100).toBeLessThanOrEqual(13);
  });

  it("drains the other lane alone when one lane is empty, no crash", () => {
    expect(fullDrainTags(50, 0)).toEqual(Array(50).fill("NE"));
    expect(fullDrainTags(0, 50)).toEqual(Array(50).fill("AT"));
  });

  it("a tie (no activity today, both lanes non-empty) resolves to never-engaged", () => {
    const candidates: ReviewCandidate[] = [
      makeNeverEngaged("ne-0"),
      makeAlreadyTouched("at-0"),
      makeAlreadyTouched("at-1"),
    ];
    const [first] = pickTerms(candidates, 1, "review");
    expect(first && tagOf(first)).toBe("NE");
  });

  it("nextLane favors never-engaged when already-touched has had today's activity and never-engaged hasn't", () => {
    // 17 eligible already-touched + 3 already-touched picked earlier today
    // (mastered_cooldown'd, so ineligible this round but still counted by
    // nextLane's today's-picks scan) vs. 100 fully untouched never-engaged.
    // Hand-computed: neTurn = 0/max(100, 11.7) = 0; atTurn = 3/max(17, 11.7)
    // = 3/17 ≈ 0.176. neTurn < atTurn, so never-engaged goes next.
    const candidates: ReviewCandidate[] = [
      ...Array.from({ length: 100 }, (_, i) => makeNeverEngaged(`ne-${i}`)),
      ...Array.from({ length: 17 }, (_, i) => makeAlreadyTouched(`at-eligible-${i}`)),
      ...Array.from({ length: 3 }, (_, i) => makeAlreadyTouched(`at-today-${i}`, 0)),
    ];
    const [first] = pickTerms(candidates, 1, "review");
    expect(first && tagOf(first)).toBe("NE");
  });

  it("nextLane favors already-touched when never-engaged has had today's activity and already-touched hasn't", () => {
    // 1 eligible never-engaged + 4 never-engaged picked earlier today
    // (mastered_cooldown'd, ineligible this round but still counted) vs.
    // 50 fully untouched already-touched. Hand-computed: neTurn =
    // 4/max(1, 5.1) = 4/5.1 ≈ 0.784; atTurn = 0/max(50, 5.1) = 0. atTurn <
    // neTurn, so already-touched goes next.
    function makeNeverEngagedPickedToday(termId: string): ReviewCandidate {
      const c = makeNeverEngaged(termId);
      c.reviewRecallCount = 1;
      c.reviewStreak = 1;
      c.lastReviewRecallAt = hoursAgo(0);
      return c;
    }

    const candidates: ReviewCandidate[] = [
      makeNeverEngaged("ne-eligible"),
      ...Array.from({ length: 4 }, (_, i) => makeNeverEngagedPickedToday(`ne-today-${i}`)),
      ...Array.from({ length: 50 }, (_, i) => makeAlreadyTouched(`at-${i}`)),
    ];
    const [first] = pickTerms(candidates, 1, "review");
    expect(first && tagOf(first)).toBe("AT");
  });
});
