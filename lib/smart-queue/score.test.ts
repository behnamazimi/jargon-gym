import { describe, expect, it } from "vitest";
import { scoreCandidate } from "./score";
import { RANKING } from "./weights";
import type { PickContext, ReviewCandidate } from "./types";

const HOUR = 60 * 60 * 1000;
const CAP_HOURS = RANKING.formula.stalenessCapHours; // 168
const TAIL_MAX = RANKING.formula.stalenessTailMaxBoost; // 12
const TAIL_DECAY_HOURS = RANKING.masteredCooldown.capHours; // 336

const now = new Date();

function hoursAgo(hours: number): Date {
  return new Date(now.getTime() - hours * HOUR);
}

/** Minimal candidate with every other signal suppressed, so only staleness
 *  contributes to the score. `ownHours` sets the context's own count/streak/
 *  last-activity fields (read for "read", review for "review", quiz for
 *  "quiz") to isolate the staleness block from unseen/struggling/fragile/
 *  cross_fail/same-day sit-outs. Optional `reviewRecallHoursAgo` is read-
 *  context only — omitted leaves `lastReviewRecallAt` null. Optional
 *  `failCount` and `ownCountOverride` (review/quiz only) let fragile-boost
 *  tests set fail count and own count independently of `streak` — both
 *  default to the prior fail-free, streak-derived behavior, so every
 *  existing call site is unaffected. */
function makeCandidate(
  context: PickContext,
  ownHours: number,
  streak = 1,
  reviewRecallHoursAgo?: number,
  failCount = 0,
  ownCountOverride?: number,
): ReviewCandidate {
  const base: ReviewCandidate = {
    termId: "t1",
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

  if (context === "read") {
    return {
      ...base,
      readCount: 1,
      lastReadAt: hoursAgo(ownHours),
      lastReviewRecallAt:
        reviewRecallHoursAgo !== undefined ? hoursAgo(reviewRecallHoursAgo) : null,
    };
  }
  if (context === "review") {
    return {
      ...base,
      reviewRecallCount: ownCountOverride ?? Math.abs(streak) + 1,
      lastReviewRecallAt: hoursAgo(ownHours),
      reviewStreak: streak,
      reviewFailCount: failCount,
    };
  }
  return {
    ...base,
    quizTestCount: ownCountOverride ?? Math.abs(streak) + 1,
    lastQuizTestedAt: hoursAgo(ownHours),
    quizStreak: streak,
    quizFailCount: failCount,
  };
}

function baseStalenessAt(ownHours: number, decayHours: number): number {
  const capped = Math.min(ownHours, CAP_HOURS);
  return RANKING.formula.stalenessMaxBoost * (1 - Math.exp(-capped / decayHours));
}

function tailAt(ownHours: number): number {
  const extra = Math.max(0, ownHours - CAP_HOURS);
  return TAIL_MAX * (1 - Math.exp(-extra / TAIL_DECAY_HOURS));
}

describe("staleness tail boost", () => {
  it("matches today's pre-tail behavior at/below the cap (regression baseline)", () => {
    const ownHours = 100; // well under the 168h cap
    const decayHours = RANKING.stalenessDecayHours.review; // streak 1 keeps the flat τ
    const { score } = scoreCandidate(
      makeCandidate("review", ownHours),
      RANKING.formula,
      "review",
      now,
    );
    expect(score).toBeCloseTo(baseStalenessAt(ownHours, decayHours), 2);
  });

  it("adds a small positive tail just past the cap", () => {
    const ownHours = CAP_HOURS + 24; // day 8
    const decayHours = RANKING.stalenessDecayHours.review;
    const { score } = scoreCandidate(
      makeCandidate("review", ownHours),
      RANKING.formula,
      "review",
      now,
    );
    const expected = baseStalenessAt(ownHours, decayHours) + tailAt(ownHours);
    expect(score).toBeCloseTo(expected, 2);
    expect(expected).toBeCloseTo(84.07, 1);
  });

  it("never exceeds the tail's own ceiling, even at extreme neglect", () => {
    // At this scale, 1 - exp(-x) rounds to exactly 1 in floating point, so
    // the tail saturates at precisely TAIL_MAX rather than staying strictly
    // below it — the invariant that matters is "never exceeds", not
    // "never reaches" (mathematically asymptotic, not floating-point exact).
    const ownHours = CAP_HOURS + 10 * 365 * 24; // 10 years past the cap
    const decayHours = RANKING.stalenessDecayHours.review;
    const { score } = scoreCandidate(
      makeCandidate("review", ownHours),
      RANKING.formula,
      "review",
      now,
    );
    const base = baseStalenessAt(ownHours, decayHours);
    expect(score - base).toBeLessThanOrEqual(TAIL_MAX);
  });

  it("increases monotonically as neglect grows past the cap — the actual fix", () => {
    const extraHoursSteps = [0, 24, 168, 336, 672, 1992];
    const scores = extraHoursSteps.map((extra) => {
      const { score } = scoreCandidate(
        makeCandidate("review", CAP_HOURS + extra),
        RANKING.formula,
        "review",
        now,
      );
      return score;
    });

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1]!);
    }
  });

  it("applies to Read too, even though Read has no streak to scale by", () => {
    const atCap = scoreCandidate(makeCandidate("read", CAP_HOURS), RANKING.formula, "read", now);
    const wellPastCap = scoreCandidate(
      makeCandidate("read", CAP_HOURS + 336),
      RANKING.formula,
      "read",
      now,
    );
    expect(wellPastCap.score).toBeGreaterThan(atCap.score);
  });

  it("stays well under struggling's max boost regardless of context, even at extreme neglect", () => {
    const ownHours = CAP_HOURS + 50 * 365 * 24; // 50 years past the cap
    const contexts: PickContext[] = ["read", "review", "quiz"];
    for (const context of contexts) {
      const { score } = scoreCandidate(
        makeCandidate(context, ownHours),
        RANKING.formula,
        context,
        now,
      );
      expect(score).toBeLessThan(100);
    }
  });

  it("keeps the flat τ for a struggling term's base curve while still adding the tail", () => {
    const ownHours = CAP_HOURS + 336;
    const streak = -2;
    const decayHours = RANKING.stalenessDecayHours.review; // streak <= 1 keeps the flat τ
    const { score } = scoreCandidate(
      makeCandidate("review", ownHours, streak),
      RANKING.formula,
      "review",
      now,
    );
    const strugglingBoost =
      Math.min(-streak, RANKING.streakBoostCap) * RANKING.formula.strugglingBoostPerStreak;
    const expectedStaleness = baseStalenessAt(ownHours, decayHours) + tailAt(ownHours);
    expect(score).toBeCloseTo(strugglingBoost + expectedStaleness, 2);
  });
});

describe("read staleness borrows review-recall timestamp", () => {
  const decayHours = RANKING.stalenessDecayHours.read;

  it("old lastReadAt, recent lastReviewRecallAt → low staleness", () => {
    const { score } = scoreCandidate(
      makeCandidate("read", 500, 1, 2),
      RANKING.formula,
      "read",
      now,
    );
    expect(score).toBeCloseTo(baseStalenessAt(2, decayHours) + tailAt(2), 2);
  });

  it("no Review history → unaffected (regression baseline)", () => {
    const ownHours = 300;
    const { score } = scoreCandidate(makeCandidate("read", ownHours), RANKING.formula, "read", now);
    expect(score).toBeCloseTo(baseStalenessAt(ownHours, decayHours) + tailAt(ownHours), 2);
  });

  it("lastReadAt more recent than lastReviewRecallAt → max() picks Read's own timestamp", () => {
    const { score } = scoreCandidate(
      makeCandidate("read", 3, 1, 400),
      RANKING.formula,
      "read",
      now,
    );
    expect(score).toBeCloseTo(baseStalenessAt(3, decayHours) + tailAt(3), 2);
  });

  it("readCount === 0 → unseen boost unaffected by Review activity", () => {
    const candidate: ReviewCandidate = {
      ...makeCandidate("read", 500),
      readCount: 0,
      lastReadAt: null,
      lastReviewRecallAt: hoursAgo(1),
    };
    const { score, reasons } = scoreCandidate(candidate, RANKING.formula, "read", now);
    expect(reasons).toContain("unseen");
    expect(reasons).not.toContain("stale");
    expect(score).toBe(RANKING.formula.unseenBoost);
  });
});

describe("stale reason is per-context and label-only", () => {
  it("Read: no stale at 25h or 47h; stale at the 7-day cap", () => {
    const at25 = scoreCandidate(makeCandidate("read", 25), RANKING.formula, "read", now);
    const at47 = scoreCandidate(makeCandidate("read", 47), RANKING.formula, "read", now);
    const atCap = scoreCandidate(makeCandidate("read", CAP_HOURS), RANKING.formula, "read", now);

    expect(at25.reasons).not.toContain("stale");
    expect(at25.reasons).toContain("steady");
    expect(at47.reasons).not.toContain("stale");
    expect(atCap.reasons).toContain("stale");
    expect(atCap.reasons).not.toContain("steady");

    expect(at25.score).toBeCloseTo(baseStalenessAt(25, RANKING.stalenessDecayHours.read), 2);
    expect(at47.score).toBeCloseTo(baseStalenessAt(47, RANKING.stalenessDecayHours.read), 2);
    expect(atCap.score).toBeCloseTo(
      baseStalenessAt(CAP_HOURS, RANKING.stalenessDecayHours.read),
      2,
    );
  });

  it("Review: no stale at 24h; stale at τ when not in cooldown", () => {
    const decayHours = RANKING.stalenessDecayHours.review;
    const at24 = scoreCandidate(makeCandidate("review", 24, -1), RANKING.formula, "review", now);
    const atTau = scoreCandidate(
      makeCandidate("review", decayHours, -1),
      RANKING.formula,
      "review",
      now,
    );

    expect(at24.reasons).not.toContain("stale");
    expect(atTau.reasons).toContain("stale");
    const strugglingBoost = RANKING.formula.strugglingBoostPerStreak;
    expect(at24.score).toBeCloseTo(strugglingBoost + baseStalenessAt(24, decayHours), 2);
    expect(atTau.score).toBeCloseTo(strugglingBoost + baseStalenessAt(decayHours, decayHours), 2);
  });

  it("Review/Quiz: past τ but inside mastered cooldown → cooldown only, no stale", () => {
    const review = scoreCandidate(
      makeCandidate("review", RANKING.stalenessDecayHours.review),
      RANKING.formula,
      "review",
      now,
    );
    const quiz = scoreCandidate(
      makeCandidate("quiz", RANKING.stalenessDecayHours.quiz),
      RANKING.formula,
      "quiz",
      now,
    );

    expect(review.reasons).toContain("mastered_cooldown");
    expect(review.reasons).not.toContain("stale");
    expect(quiz.reasons).toContain("mastered_cooldown");
    expect(quiz.reasons).not.toContain("stale");
  });

  it("Quiz: stale at τ when not in cooldown (negative streak)", () => {
    const decayHours = RANKING.stalenessDecayHours.quiz;
    const { score, reasons } = scoreCandidate(
      makeCandidate("quiz", decayHours, -1),
      RANKING.formula,
      "quiz",
      now,
    );

    expect(reasons).toContain("stale");
    expect(reasons).not.toContain("mastered_cooldown");
    expect(score).toBeCloseTo(
      RANKING.formula.strugglingBoostPerStreak + baseStalenessAt(decayHours, decayHours),
      2,
    );
  });
});

/** Isolates fragileBoost's contribution to the total score: `ownHours = 0`
 *  zeroes both staleness boosts (hours-since-activity = 0), and `streak = 0`
 *  avoids both mastered_cooldown (streak > 0) and struggling (streak < 0).
 *  With those neutralized, scoreCandidate's total equals fragileBoost
 *  exactly for `ownCount > 0` (for `ownCount = 0`, `unseen` fires instead). */
function fragileOnly(totalTests: number, totalFails: number) {
  return scoreCandidate(
    makeCandidate("review", 0, 0, undefined, totalFails, totalTests),
    RANKING.formula,
    "review",
    now,
  );
}

describe("fragile boost", () => {
  const MAX = RANKING.formula.fragileBoostMax; // 35
  const K = RANKING.fragileConfidenceStrength; // 4
  const expected = (totalTests: number, totalFails: number) =>
    (MAX * totalFails) / (totalTests + K);

  it("totalTests = 0 → fragile absent, unseen owns this case", () => {
    const { reasons } = fragileOnly(0, 0);
    expect(reasons).not.toContain("fragile");
    expect(reasons).toContain("unseen");
  });

  it("a single clean pass is never fragile, even with zero evidence to the contrary", () => {
    const { score, reasons } = fragileOnly(1, 0);
    expect(reasons).not.toContain("fragile");
    expect(score).toBeCloseTo(0, 5);
  });

  it("a single fail registers immediately, unlike the old hard gate", () => {
    const { score, reasons } = fragileOnly(1, 1);
    expect(reasons).toContain("fragile");
    expect(score).toBeCloseTo(expected(1, 1), 2);
    expect(score).toBeCloseTo(7.0, 2);
  });

  it("matches the confidence-weighted formula at a few representative points", () => {
    expect(fragileOnly(2, 1).score).toBeCloseTo(expected(2, 1), 2);
    expect(fragileOnly(4, 4).score).toBeCloseTo(expected(4, 4), 2);
    expect(fragileOnly(4, 4).score).toBeCloseTo(17.5, 2);
    expect(fragileOnly(20, 20).score).toBeCloseTo(expected(20, 20), 2);
  });

  it("increases monotonically with attempts at a fixed raw fail rate", () => {
    const low = fragileOnly(2, 1).score; // 50% raw rate, thin evidence
    const high = fragileOnly(10, 5).score; // same 50% rate, more evidence
    expect(high).toBeGreaterThan(low);
  });

  it("never exceeds fragileBoostMax, even at extreme evidence", () => {
    const { score } = fragileOnly(10000, 10000);
    expect(score).toBeLessThan(MAX);
    expect(score).toBeGreaterThan(MAX - 1);
  });

  it("fires alongside mastered_cooldown for a real prod-shaped term (\"Grounding\")", () => {
    const candidate = makeCandidate("review", 24, 3, undefined, 5, 9);
    const { score, reasons } = scoreCandidate(candidate, RANKING.formula, "review", now);

    expect(reasons).toContain("fragile");
    expect(reasons).toContain("mastered_cooldown");
    expect(score).toBeCloseTo(-87.28, 1);
  });
});
