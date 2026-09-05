import { describe, expect, it } from "vitest";
import { PACE_ESTIMATE_RANGE_MULTIPLIER } from "./constants";
import { computeCrossingPace, estimateMilestone, partitionMasteryBuckets } from "./pace";

const NOW = new Date("2026-02-01T00:00:00Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

describe("partitionMasteryBuckets", () => {
  it("is all-zero for an empty list", () => {
    expect(partitionMasteryBuckets([])).toEqual({
      neverLearning: 0,
      learningNotMastered: 0,
      mastered: 0,
    });
  });

  it("buckets a term with neither timestamp as neverLearning", () => {
    const buckets = partitionMasteryBuckets([{ everLearningAt: null, everMasteredAt: null }]);
    expect(buckets).toEqual({ neverLearning: 1, learningNotMastered: 0, mastered: 0 });
  });

  it("buckets a term with only everLearningAt as learningNotMastered", () => {
    const buckets = partitionMasteryBuckets([{ everLearningAt: daysAgo(5), everMasteredAt: null }]);
    expect(buckets).toEqual({ neverLearning: 0, learningNotMastered: 1, mastered: 0 });
  });

  it("buckets a term with both timestamps as mastered, never double-counted", () => {
    const buckets = partitionMasteryBuckets([
      { everLearningAt: daysAgo(10), everMasteredAt: daysAgo(1) },
    ]);
    expect(buckets).toEqual({ neverLearning: 0, learningNotMastered: 0, mastered: 1 });
  });
});

describe("computeCrossingPace", () => {
  it("returns null for an empty timestamp list", () => {
    expect(computeCrossingPace([], NOW)).toBeNull();
  });

  it("returns null when there's only ever been one crossing", () => {
    expect(computeCrossingPace([daysAgo(1)], NOW)).toBeNull();
  });

  it("picks the tightest rung that clears the minimum sample", () => {
    const result = computeCrossingPace([daysAgo(1), daysAgo(2)], NOW);
    expect(result).toEqual({ perDay: 2 / 3, windowDays: 3, crossingsInWindow: 2 });
  });

  it("widens to a later rung when the tightest one doesn't have enough samples", () => {
    // Only 1 crossing in the last 3 days, but 2 within 7.
    const result = computeCrossingPace([daysAgo(1), daysAgo(6)], NOW);
    expect(result).toEqual({ perDay: 2 / 7, windowDays: 7, crossingsInWindow: 2 });
  });

  it("falls back to an all-time rung anchored on the earliest crossing", () => {
    // Only 1 crossing within 30 days, but 2 ever.
    const result = computeCrossingPace([daysAgo(5), daysAgo(50)], NOW);
    expect(result).not.toBeNull();
    expect(result?.windowDays).toBeCloseTo(50, 5);
    expect(result?.crossingsInWindow).toBe(2);
    expect(result?.perDay).toBeCloseTo(2 / 50, 10);
  });

  it("returns null when every rung including all-time has fewer than 2 crossings", () => {
    expect(computeCrossingPace([daysAgo(1000)], NOW)).toBeNull();
  });
});

describe("estimateMilestone", () => {
  it("is 'none' when nothing remains, regardless of pace", () => {
    expect(estimateMilestone(0, null)).toEqual({ kind: "none" });
    expect(estimateMilestone(0, { perDay: 1, windowDays: 3, crossingsInWindow: 3 })).toEqual({
      kind: "none",
    });
  });

  it("is a literal count at or below the small-remaining threshold", () => {
    expect(estimateMilestone(1, null)).toEqual({ kind: "count", remaining: 1 });
    expect(estimateMilestone(2, { perDay: 1, windowDays: 3, crossingsInWindow: 3 })).toEqual({
      kind: "count",
      remaining: 2,
    });
  });

  it("is 'insufficientData' above the threshold with no pace", () => {
    expect(estimateMilestone(3, null)).toEqual({ kind: "insufficientData", remaining: 3 });
  });

  it("computes a low/high estimate range using the range multiplier", () => {
    const estimate = estimateMilestone(10, { perDay: 1, windowDays: 10, crossingsInWindow: 10 });
    expect(estimate).toEqual({
      kind: "estimate",
      remaining: 10,
      lowDays: 10,
      highDays: 10 * PACE_ESTIMATE_RANGE_MULTIPLIER,
    });
  });
});
