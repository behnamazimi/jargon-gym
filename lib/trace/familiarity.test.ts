import { describe, expect, it } from "vitest";
import { computeFamiliarity, familiarityUsed, rawFamiliarityGrowth } from "./familiarity";
import { FAMILIARITY_CAP, FAMILIARITY_DECAY_RATE, FAMILIARITY_GROWTH_RATE } from "./constants";

describe("rawFamiliarityGrowth", () => {
  it("is 0 for a never-read term", () => {
    expect(rawFamiliarityGrowth(0)).toBe(0);
  });

  it("matches the recursive definition F' = F + w_f·e^(−k·n)", () => {
    for (const n of [1, 2, 5, 10]) {
      let recursive = 0;
      for (let i = 0; i < n; i++) {
        recursive += FAMILIARITY_GROWTH_RATE * Math.exp(-FAMILIARITY_DECAY_RATE * i);
      }
      expect(rawFamiliarityGrowth(n)).toBeCloseTo(recursive, 10);
    }
  });

  it("grows monotonically but with diminishing increments", () => {
    const values = [1, 2, 3, 4, 5].map(rawFamiliarityGrowth);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!).toBeGreaterThan(values[i - 1]!);
    }
    const increments = values.slice(1).map((v, i) => v - values[i]!);
    for (let i = 1; i < increments.length; i++) {
      expect(increments[i]!).toBeLessThan(increments[i - 1]!);
    }
  });
});

describe("computeFamiliarity", () => {
  it("is 0 when never read", () => {
    expect(computeFamiliarity(0, null, new Date())).toBe(0);
  });

  it("equals raw growth with no elapsed time", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(computeFamiliarity(3, now, now)).toBeCloseTo(rawFamiliarityGrowth(3), 10);
  });

  it("decays with elapsed days since last read", () => {
    const lastRead = new Date("2026-01-01T00:00:00Z");
    const later = new Date("2026-01-11T00:00:00Z"); // 10 days later
    const raw = rawFamiliarityGrowth(3);
    const decayed = computeFamiliarity(3, lastRead, later);
    expect(decayed).toBeLessThan(raw);
    expect(decayed).toBeCloseTo(raw / 2, 5); // scale=10 days => halved at t=10
  });
});

describe("familiarityUsed", () => {
  it("caps mastery contribution at FAMILIARITY_CAP", () => {
    expect(familiarityUsed(0.1)).toBe(0.1);
    expect(familiarityUsed(FAMILIARITY_CAP)).toBe(FAMILIARITY_CAP);
    expect(familiarityUsed(10)).toBe(FAMILIARITY_CAP);
  });
});
