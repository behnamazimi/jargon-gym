import { describe, expect, it } from "vitest";
import { computeRecentPacePerWeek, estimateWeeksRemaining } from "./pace";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date("2026-09-01T00:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY_MS);

describe("computeRecentPacePerWeek", () => {
  it("returns null below the minimum sample count", () => {
    expect(computeRecentPacePerWeek([daysAgo(5)], now)).toBeNull();
    expect(computeRecentPacePerWeek([], now)).toBeNull();
  });

  it("returns terms-per-week once the minimum is met", () => {
    // 4 mastered inside a 28-day (4-week) window → 1/week.
    const dates = [daysAgo(2), daysAgo(10), daysAgo(18), daysAgo(26)];
    expect(computeRecentPacePerWeek(dates, now)).toBeCloseTo(1, 10);
  });

  it("ignores dates outside the lookback window", () => {
    const dates = [daysAgo(2), daysAgo(10), daysAgo(40), daysAgo(100)];
    // Only 2 of the 4 fall inside the default 28-day window → 2/4 weeks = 0.5/week.
    expect(computeRecentPacePerWeek(dates, now)).toBeCloseTo(0.5, 10);
  });

  it("ignores null entries (terms never mastered)", () => {
    const dates = [daysAgo(2), null, daysAgo(10), null];
    expect(computeRecentPacePerWeek(dates, now)).toBeCloseTo(0.5, 10);
  });

  it("respects a custom lookback window and minimum sample count", () => {
    const dates = [daysAgo(1), daysAgo(3), daysAgo(5)];
    expect(computeRecentPacePerWeek(dates, now, { lookbackDays: 7, minSamples: 3 })).toBeCloseTo(
      3,
      10,
    );
    expect(computeRecentPacePerWeek(dates, now, { lookbackDays: 7, minSamples: 4 })).toBeNull();
  });
});

describe("estimateWeeksRemaining", () => {
  it("null when pace couldn't be estimated", () => {
    expect(estimateWeeksRemaining(10, null)).toBeNull();
  });

  it("null when pace is zero or negative", () => {
    expect(estimateWeeksRemaining(10, 0)).toBeNull();
    expect(estimateWeeksRemaining(10, -1)).toBeNull();
  });

  it("null when nothing remains (collection already complete)", () => {
    expect(estimateWeeksRemaining(0, 2)).toBeNull();
    expect(estimateWeeksRemaining(-3, 2)).toBeNull();
  });

  it("rounds up to a whole number of weeks", () => {
    expect(estimateWeeksRemaining(10, 2)).toBe(5);
    expect(estimateWeeksRemaining(9, 2)).toBe(5);
    expect(estimateWeeksRemaining(1, 2)).toBe(1);
  });
});
