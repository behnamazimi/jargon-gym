import { describe, expect, it } from "vitest";
import { AGAIN, EASY, FSRS_WEIGHTS, GOOD, HARD } from "./constants";
import {
  applyColdStartNudge,
  applyReviewGrade,
  initialDifficulty,
  initialStability,
  retrievability,
  sameDayStability,
  updateDifficulty,
  updateStabilityOnLapse,
  updateStabilityOnSuccess,
} from "./recall";

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

describe("updateStabilityOnSuccess / updateStabilityOnLapse", () => {
  it("a successful review at low retrievability grows stability more than at high retrievability", () => {
    const grownAtLowR = updateStabilityOnSuccess(5, 10, 0.5, GOOD);
    const grownAtHighR = updateStabilityOnSuccess(5, 10, 0.95, GOOD);
    expect(grownAtLowR).toBeGreaterThan(10);
    expect(grownAtHighR).toBeGreaterThan(10);
    expect(grownAtLowR).toBeGreaterThan(grownAtHighR);
  });

  it("Easy grows stability more than Good, which grows more than Hard", () => {
    const s = 10;
    const easy = updateStabilityOnSuccess(5, s, 0.8, EASY);
    const good = updateStabilityOnSuccess(5, s, 0.8, GOOD);
    const hard = updateStabilityOnSuccess(5, s, 0.8, HARD);
    expect(easy).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(hard);
  });

  it("lapse stability is a positive number, typically well below pre-lapse stability", () => {
    const s = updateStabilityOnLapse(5, 20, 0.7);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(20);
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

  it("same local day re-review uses the same-day formula", () => {
    const morning = new Date("2026-01-01T08:00:00Z");
    const evening = new Date("2026-01-01T20:00:00Z");
    const current = { stability: 5, difficulty: 5 };
    const result = applyReviewGrade(current, GOOD, 0, evening, morning);
    const expectedStability = sameDayStability(5, GOOD);
    expect(result.stability).toBeCloseTo(expectedStability, 10);
  });

  it("a later-day Again lapse drops stability sharply", () => {
    const day1 = new Date("2026-01-01T00:00:00Z");
    const day10 = new Date("2026-01-11T00:00:00Z");
    const current = { stability: 20, difficulty: 5 };
    const result = applyReviewGrade(current, AGAIN, 0, day10, day1);
    expect(result.stability).toBeLessThan(20);
  });
});
