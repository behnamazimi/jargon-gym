import { describe, expect, it } from "vitest";
import {
  AGAIN,
  EASY,
  FSRS_WEIGHTS,
  GOOD,
  HARD,
  HARD_LAPSE_BLEND,
  UNTESTED_RECALL_RETRIEVABILITY,
} from "./constants";
import {
  applyColdStartNudge,
  applyReviewGrade,
  daysUntilRetrievability,
  initialDifficulty,
  initialStability,
  retrievability,
  sameDayStability,
  updateDifficulty,
  updateStabilityOnHard,
  updateStabilityOnLapse,
  updateStabilityOnSuccess,
} from "./recall";
import type { ReviewGrade } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("initialStability / initialDifficulty", () => {
  it("S0(G) = w[G-1]", () => {
    expect(initialStability(AGAIN)).toBe(FSRS_WEIGHTS[0]);
    expect(initialStability(HARD)).toBe(FSRS_WEIGHTS[1]);
    expect(initialStability(GOOD)).toBe(FSRS_WEIGHTS[2]);
    expect(initialStability(EASY)).toBe(FSRS_WEIGHTS[3]);
  });

  it("D0(G) = clamp(w4 − e^(w5·(G−1)) + 1, 1, 10)", () => {
    for (const g of [AGAIN, HARD, GOOD, EASY] as const) {
      const expected = Math.min(
        10,
        Math.max(1, FSRS_WEIGHTS[4] - Math.exp(FSRS_WEIGHTS[5] * (g - 1)) + 1),
      );
      expect(initialDifficulty(g)).toBeCloseTo(expected, 10);
    }
  });

  it("difficulty increases with grade severity (Again hardest, Easy easiest)", () => {
    expect(initialDifficulty(AGAIN)).toBeGreaterThan(initialDifficulty(HARD));
    expect(initialDifficulty(HARD)).toBeGreaterThan(initialDifficulty(GOOD));
    expect(initialDifficulty(GOOD)).toBeGreaterThan(initialDifficulty(EASY));
  });
});

describe("retrievability", () => {
  it("is 1 at t=0 regardless of stability", () => {
    expect(retrievability(5, 0)).toBe(1);
    expect(retrievability(0.5, 0)).toBe(1);
  });

  it("decays monotonically with elapsed time", () => {
    const r1 = retrievability(10, 5);
    const r2 = retrievability(10, 15);
    const r3 = retrievability(10, 30);
    expect(r1).toBeGreaterThan(r2);
    expect(r2).toBeGreaterThan(r3);
  });

  it("higher stability retains higher retrievability at the same elapsed time", () => {
    expect(retrievability(20, 10)).toBeGreaterThan(retrievability(5, 10));
  });

  it("is 0.9 exactly when elapsed time equals stability (FSRS-5 curve)", () => {
    expect(retrievability(3, 3)).toBeCloseTo(0.9, 10);
    expect(retrievability(40, 40)).toBeCloseTo(0.9, 10);
  });

  it("follows (1 + 19/81·t/S)^-0.5", () => {
    expect(retrievability(10, 30)).toBeCloseTo((1 + ((19 / 81) * 30) / 10) ** -0.5, 10);
  });
});

describe("daysUntilRetrievability", () => {
  it("inverts retrievability", () => {
    for (const target of [0.98, 0.85, 0.7]) {
      const days = daysUntilRetrievability(12, target);
      expect(retrievability(12, days)).toBeCloseTo(target, 10);
    }
  });
});

describe("updateDifficulty", () => {
  it("Good (grade=3) leaves difficulty exactly unchanged (ΔD=0, ignoring mean-reversion)", () => {
    // ΔD = -w6·(3-3) = 0, so updated === difficulty before mean-reversion blends in D0(Easy).
    const d = 5;
    const result = updateDifficulty(d, GOOD);
    const expected = FSRS_WEIGHTS[7] * initialDifficulty(EASY) + (1 - FSRS_WEIGHTS[7]) * d;
    expect(result).toBeCloseTo(expected, 10);
  });

  it("Again increases difficulty, Easy decreases it, relative to Good", () => {
    const d = 5;
    expect(updateDifficulty(d, AGAIN)).toBeGreaterThan(updateDifficulty(d, GOOD));
    expect(updateDifficulty(d, EASY)).toBeLessThan(updateDifficulty(d, GOOD));
  });

  it("stays within [1, 10]", () => {
    expect(updateDifficulty(1, EASY)).toBeGreaterThanOrEqual(1);
    expect(updateDifficulty(10, AGAIN)).toBeLessThanOrEqual(10);
  });
});

describe("updateStabilityOnSuccess / updateStabilityOnLapse / updateStabilityOnHard", () => {
  it("a successful review at low retrievability grows stability more than at high retrievability", () => {
    const grownAtLowR = updateStabilityOnSuccess(5, 10, 0.5, GOOD);
    const grownAtHighR = updateStabilityOnSuccess(5, 10, 0.95, GOOD);
    expect(grownAtLowR).toBeGreaterThan(10);
    expect(grownAtHighR).toBeGreaterThan(10);
    expect(grownAtLowR).toBeGreaterThan(grownAtHighR);
  });

  it("a Good adds proportionally less the stronger a term already is", () => {
    const growthWhenYoung = updateStabilityOnSuccess(5, 5, 0.85, GOOD) / 5;
    const growthWhenStrong = updateStabilityOnSuccess(5, 100, 0.85, GOOD) / 100;
    expect(growthWhenStrong).toBeGreaterThan(1);
    expect(growthWhenStrong).toBeLessThan(growthWhenYoung);
  });

  it("orders the grades Easy > Good > S > Hard > Again on a strong term", () => {
    const s = 30;
    const easy = updateStabilityOnSuccess(5, s, 0.85, EASY);
    const good = updateStabilityOnSuccess(5, s, 0.85, GOOD);
    const hard = updateStabilityOnHard(5, s, 0.85);
    const again = updateStabilityOnLapse(5, s, 0.85);
    expect(easy).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(s);
    expect(hard).toBeLessThan(s);
    expect(hard).toBeGreaterThan(again);
  });

  it("Hard is the HARD_LAPSE_BLEND geometric blend of the Again and Good outcomes", () => {
    const again = updateStabilityOnLapse(6, 4, 0.8);
    const good = updateStabilityOnSuccess(6, 4, 0.8, GOOD);
    expect(updateStabilityOnHard(6, 4, 0.8)).toBeCloseTo(
      again ** HARD_LAPSE_BLEND * good ** (1 - HARD_LAPSE_BLEND),
      10,
    );
  });

  it("lapse stability is a positive number, well below pre-lapse stability", () => {
    const s = updateStabilityOnLapse(5, 20, 0.7);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(20);
  });

  it("a lapse never raises stability, even on a young term reviewed late", () => {
    const s = 0.41;
    const lapsed = updateStabilityOnLapse(8, s, 0.3);
    expect(lapsed).toBeLessThanOrEqual(s / Math.exp(FSRS_WEIGHTS[17] * FSRS_WEIGHTS[18]));
  });
});

describe("sameDayStability", () => {
  it("matches the closed-form formula exactly", () => {
    const s = 5;
    for (const g of [AGAIN, HARD, GOOD, EASY] as const) {
      const expected = s * Math.exp(FSRS_WEIGHTS[17] * (g - 3 + FSRS_WEIGHTS[18]));
      expect(sameDayStability(s, g)).toBeCloseTo(expected, 10);
    }
  });
});

describe("applyColdStartNudge (§3)", () => {
  it("collapses to plain FSRS defaults when familiarity is 0", () => {
    const d0 = initialDifficulty(GOOD);
    const s0 = initialStability(GOOD);
    const nudged = applyColdStartNudge(d0, s0, 0);
    expect(nudged.difficulty).toBeCloseTo(d0, 10);
    expect(nudged.stability).toBeCloseTo(s0, 10);
  });

  it("higher familiarity lowers difficulty and raises stability", () => {
    const d0 = initialDifficulty(GOOD);
    const s0 = initialStability(GOOD);
    const nudged = applyColdStartNudge(d0, s0, 0.3);
    expect(nudged.difficulty).toBeLessThan(d0);
    expect(nudged.stability).toBeGreaterThan(s0);
  });
});

describe("applyReviewGrade orchestration", () => {
  it("first-ever grade (current=null) applies cold-start nudge only", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = applyReviewGrade(null, GOOD, 0.2, now, null);
    const d0 = initialDifficulty(GOOD);
    const s0 = initialStability(GOOD);
    const expected = applyColdStartNudge(d0, s0, 0.2);
    expect(result.difficulty).toBeCloseTo(expected.difficulty, 10);
    expect(result.stability).toBeCloseTo(expected.stability, 10);
  });

  it("a re-review less than a day later uses the short-term formula, even across midnight", () => {
    const lateEvening = new Date("2026-01-01T23:50:00Z");
    const pastMidnight = new Date("2026-01-02T00:10:00Z");
    const current = { stability: 5, difficulty: 5 };
    const result = applyReviewGrade(current, GOOD, 0, pastMidnight, lateEvening);
    expect(result.stability).toBeCloseTo(sameDayStability(5, GOOD), 10);
  });

  it("a review a day or more later uses the long-term formulas", () => {
    const day1 = new Date("2026-01-01T08:00:00Z");
    const day2 = new Date(day1.getTime() + DAY_MS);
    const current = { stability: 5, difficulty: 5 };
    const result = applyReviewGrade(current, GOOD, 0, day2, day1);
    expect(result.stability).toBeCloseTo(
      updateStabilityOnSuccess(5, 5, retrievability(5, 1), GOOD),
      10,
    );
  });

  it("computes stability from the difficulty before the grade, then updates difficulty", () => {
    const day1 = new Date("2026-01-01T00:00:00Z");
    const day10 = new Date("2026-01-11T00:00:00Z");
    const current = { stability: 20, difficulty: 5 };
    const result = applyReviewGrade(current, AGAIN, 0, day10, day1);
    expect(result.stability).toBeCloseTo(updateStabilityOnLapse(5, 20, retrievability(20, 10)), 10);
    expect(result.difficulty).toBeCloseTo(updateDifficulty(5, AGAIN), 10);
  });

  it("a later-day Again lapse drops stability sharply", () => {
    const day1 = new Date("2026-01-01T00:00:00Z");
    const day10 = new Date("2026-01-11T00:00:00Z");
    const current = { stability: 20, difficulty: 5 };
    const result = applyReviewGrade(current, AGAIN, 0, day10, day1);
    expect(result.stability).toBeLessThan(20 * 0.25);
  });

  it("a later-day Hard on a strong term pulls it back", () => {
    const day1 = new Date("2026-01-01T00:00:00Z");
    const day40 = new Date("2026-02-10T00:00:00Z");
    const current = { stability: 40, difficulty: 5 };
    const result = applyReviewGrade(current, HARD, 0, day40, day1);
    expect(result.stability).toBeLessThan(40);
  });
});

describe("review gaps at the Review target", () => {
  const target = UNTESTED_RECALL_RETRIEVABILITY;

  /** Grades a term each time it falls to the target and returns the gap after each grade. */
  function gaps(grades: ReviewGrade[]): number[] {
    let at = new Date("2026-01-01T00:00:00Z");
    let state = applyReviewGrade(null, grades[0]!, 0, at, null);
    const result = [daysUntilRetrievability(state.stability, target)];
    for (const grade of grades.slice(1)) {
      const next = new Date(at.getTime() + result.at(-1)! * DAY_MS);
      state = applyReviewGrade(state, grade, 0, next, at);
      at = next;
      result.push(daysUntilRetrievability(state.stability, target));
    }
    return result;
  }

  it("five Goods in a row keep each gap under a year, and each one grows by less", () => {
    const g = gaps([GOOD, GOOD, GOOD, GOOD, GOOD]);
    expect(g.at(-1)!).toBeLessThan(365);
    const ratios = g.slice(1).map((gap, i) => gap / g[i]!);
    for (let i = 1; i < ratios.length; i++) expect(ratios[i]!).toBeLessThan(ratios[i - 1]!);
  });

  it("an Again on a well-known term brings it back within a week", () => {
    expect(gaps([GOOD, GOOD, GOOD, AGAIN]).at(-1)!).toBeLessThan(7);
  });

  it("a Hard on a well-known term shortens the next gap", () => {
    const g = gaps([GOOD, GOOD, GOOD, HARD]);
    expect(g.at(-1)!).toBeLessThan(g.at(-2)!);
  });
});
