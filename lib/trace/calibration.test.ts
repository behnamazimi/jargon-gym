import { describe, expect, it } from "vitest";
import { AGAIN, EASY, GOOD, HARD } from "./constants";
import {
  computeAttentionFlag,
  computeCrossTrackFlag,
  findAbandonedReveals,
  summarizeActivityTimeline,
  summarizeCalibration,
  summarizeGradeDistribution,
  summarizeRetrievabilityDistribution,
  type TraceEventName,
} from "./calibration";

describe("summarizeCalibration", () => {
  it("returns null MAE and all-empty buckets for no rows — not 0 or NaN", () => {
    const summary = summarizeCalibration([]);
    expect(summary.n).toBe(0);
    expect(summary.meanAbsoluteError).toBeNull();
    expect(summary.buckets).toHaveLength(10);
    for (const bucket of summary.buckets) {
      expect(bucket.n).toBe(0);
      expect(bucket.passRate).toBeNull();
    }
  });

  it("excludes rows with no prediction (a term's first-ever grade) before aggregating", () => {
    const summary = summarizeCalibration([
      { retrievabilityBefore: null, passed: true },
      { retrievabilityBefore: null, passed: false },
    ]);
    expect(summary.n).toBe(0);
    expect(summary.meanAbsoluteError).toBeNull();
  });

  it("clamps retrievability of exactly 1.0 into the last bucket, not an 11th one", () => {
    const summary = summarizeCalibration(
      Array.from({ length: 5 }, () => ({ retrievabilityBefore: 1, passed: true })),
    );
    expect(summary.buckets).toHaveLength(10);
    expect(summary.buckets[9]!.n).toBe(5);
    expect(summary.buckets[9]!.rangeStart).toBeCloseTo(0.9);
    expect(summary.buckets[9]!.rangeEnd).toBeCloseTo(1);
  });

  it("renders a bucket below the minimum sample as 'not enough data' (null), not a percentage", () => {
    const summary = summarizeCalibration(
      Array.from({ length: 4 }, () => ({ retrievabilityBefore: 0.75, passed: true })),
    );
    const bucket = summary.buckets[7]!; // 0.7-0.8
    expect(bucket.n).toBe(4);
    expect(bucket.passRate).toBeNull();
  });

  it("reports a real pass rate once a bucket reaches the minimum sample", () => {
    const rows = [
      { retrievabilityBefore: 0.72, passed: true },
      { retrievabilityBefore: 0.74, passed: true },
      { retrievabilityBefore: 0.76, passed: false },
      { retrievabilityBefore: 0.78, passed: true },
      { retrievabilityBefore: 0.79, passed: true },
    ];
    const summary = summarizeCalibration(rows);
    const bucket = summary.buckets[7]!; // 0.7-0.8
    expect(bucket.n).toBe(5);
    expect(bucket.passRate).toBeCloseTo(0.8);
  });

  it("computes mean absolute error against the binary outcome", () => {
    const summary = summarizeCalibration([
      { retrievabilityBefore: 0.9, passed: true }, // |0.9 - 1| = 0.1
      { retrievabilityBefore: 0.3, passed: true }, // |0.3 - 1| = 0.7
    ]);
    expect(summary.meanAbsoluteError).toBeCloseTo(0.4);
  });
});

describe("computeAttentionFlag", () => {
  it("returns null below the minimum recent-event count, however large the gap", () => {
    const flag = computeAttentionFlag("recall", [
      { retrievabilityBefore: 0.9, passed: false },
      { retrievabilityBefore: 0.9, passed: false },
    ]);
    expect(flag).toBeNull();
  });

  it("returns null when predicted and actual are close enough", () => {
    const flag = computeAttentionFlag("recall", [
      { retrievabilityBefore: 0.7, passed: true },
      { retrievabilityBefore: 0.7, passed: true },
      { retrievabilityBefore: 0.7, passed: false },
    ]);
    // predicted 0.7, actual 2/3 ≈ 0.667 — well under the 0.35 default threshold
    expect(flag).toBeNull();
  });

  it("flags a term whose recent actual pass rate diverges sharply from what it predicts", () => {
    const flag = computeAttentionFlag("recall", [
      { retrievabilityBefore: 0.9, passed: false },
      { retrievabilityBefore: 0.85, passed: false },
      { retrievabilityBefore: 0.92, passed: false },
    ]);
    expect(flag).not.toBeNull();
    expect(flag!.track).toBe("recall");
    expect(flag!.sampleSize).toBe(3);
    expect(flag!.predicted).toBeCloseTo(0.89, 1);
    expect(flag!.actual).toBe(0);
  });

  it("excludes events with no prediction from both the count and the comparison", () => {
    const flag = computeAttentionFlag("recognition", [
      { retrievabilityBefore: null, passed: true },
      { retrievabilityBefore: 0.9, passed: false },
      { retrievabilityBefore: 0.9, passed: false },
    ]);
    // only 2 predicted events remain — under the default minimum of 3
    expect(flag).toBeNull();
  });
});

describe("findAbandonedReveals", () => {
  const NOW = new Date("2026-09-01T12:00:00Z");

  function ev(termId: string, event: TraceEventName, createdAt: string) {
    return { termId, event, createdAt: new Date(createdAt) };
  }

  it("does not flag a reveal younger than the window — not abandoned yet, just not graded yet", () => {
    const abandoned = findAbandonedReveals(
      [ev("t1", "reveal", "2026-09-01T11:55:00Z")], // 5 minutes ago
      { now: NOW },
    );
    expect(abandoned).toHaveLength(0);
  });

  it("flags a reveal older than the window with no grade at all", () => {
    const abandoned = findAbandonedReveals(
      [ev("t1", "reveal", "2026-09-01T11:00:00Z")], // 60 minutes ago
      { now: NOW },
    );
    expect(abandoned).toEqual([{ termId: "t1", revealedAt: new Date("2026-09-01T11:00:00Z") }]);
  });

  it("does not flag a reveal graded within the window", () => {
    const abandoned = findAbandonedReveals(
      [ev("t1", "reveal", "2026-09-01T11:00:00Z"), ev("t1", "review_pass", "2026-09-01T11:03:00Z")],
      { now: NOW },
    );
    expect(abandoned).toHaveLength(0);
  });

  it("flags a reveal whose grade landed outside the window", () => {
    const abandoned = findAbandonedReveals(
      [
        ev("t1", "reveal", "2026-09-01T11:00:00Z"),
        ev("t1", "review_pass", "2026-09-01T11:45:00Z"), // 45 minutes later
      ],
      { now: NOW },
    );
    expect(abandoned).toHaveLength(1);
  });

  it("judges each reveal against what immediately follows it, even in a reveal-reveal-grade sequence", () => {
    const abandoned = findAbandonedReveals(
      [
        ev("t1", "reveal", "2026-09-01T10:00:00Z"), // abandoned: next event is another reveal
        ev("t1", "reveal", "2026-09-01T10:05:00Z"), // not abandoned: graded within window
        ev("t1", "review_pass", "2026-09-01T10:07:00Z"),
      ],
      { now: NOW },
    );
    expect(abandoned).toHaveLength(1);
    expect(abandoned[0]!.revealedAt).toEqual(new Date("2026-09-01T10:00:00Z"));
  });

  it("sorts results most-recently-abandoned first", () => {
    const abandoned = findAbandonedReveals(
      [
        ev("older", "reveal", "2026-09-01T09:00:00Z"),
        ev("newer", "reveal", "2026-09-01T10:00:00Z"),
      ],
      { now: NOW },
    );
    expect(abandoned.map((a) => a.termId)).toEqual(["newer", "older"]);
  });
});

describe("summarizeGradeDistribution", () => {
  it("returns all-zero counts for no rows", () => {
    const dist = summarizeGradeDistribution([]);
    expect(dist).toEqual({ [AGAIN]: 0, [HARD]: 0, [GOOD]: 0, [EASY]: 0 });
  });

  it("ignores rows with no grade (reveal/quiz events)", () => {
    const dist = summarizeGradeDistribution([{ grade: null }, { grade: null }]);
    expect(dist).toEqual({ [AGAIN]: 0, [HARD]: 0, [GOOD]: 0, [EASY]: 0 });
  });

  it("counts each grade independently", () => {
    const dist = summarizeGradeDistribution([
      { grade: AGAIN },
      { grade: GOOD },
      { grade: GOOD },
      { grade: EASY },
    ]);
    expect(dist).toEqual({ [AGAIN]: 1, [HARD]: 0, [GOOD]: 2, [EASY]: 1 });
  });
});

describe("summarizeRetrievabilityDistribution", () => {
  it("returns 10 empty buckets for no values", () => {
    const buckets = summarizeRetrievabilityDistribution([]);
    expect(buckets).toHaveLength(10);
    for (const bucket of buckets) {
      expect(bucket.n).toBe(0);
    }
  });

  it("excludes null values (untested terms)", () => {
    const buckets = summarizeRetrievabilityDistribution([null, null]);
    expect(buckets.every((b) => b.n === 0)).toBe(true);
  });

  it("clamps a value of exactly 1.0 into the last bucket, not an 11th one", () => {
    const buckets = summarizeRetrievabilityDistribution([1]);
    expect(buckets[9]!.n).toBe(1);
    expect(buckets[9]!.rangeStart).toBeCloseTo(0.9);
    expect(buckets[9]!.rangeEnd).toBeCloseTo(1);
  });

  it("sorts values into the right bucket by range", () => {
    const buckets = summarizeRetrievabilityDistribution([0.05, 0.75, 0.76, null]);
    expect(buckets[0]!.n).toBe(1);
    expect(buckets[7]!.n).toBe(2);
    expect(buckets.reduce((sum, b) => sum + b.n, 0)).toBe(3);
  });
});

describe("computeCrossTrackFlag", () => {
  it("returns null when recall retrievability is missing", () => {
    expect(computeCrossTrackFlag(null, 0.9)).toBeNull();
  });

  it("returns null when recognition retrievability is missing", () => {
    expect(computeCrossTrackFlag(0.9, null)).toBeNull();
  });

  it("returns null when both tracks agree closely enough", () => {
    expect(computeCrossTrackFlag(0.7, 0.8)).toBeNull();
  });

  it("returns null exactly at the threshold — divergence must exceed it, not just reach it", () => {
    expect(computeCrossTrackFlag(0.9, 0.55)).toBeNull(); // divergence 0.35
  });

  it("flags a term whose recall and recognition retrievability disagree sharply", () => {
    const flag = computeCrossTrackFlag(0.95, 0.2);
    expect(flag).not.toBeNull();
    expect(flag!.recallRetrievability).toBe(0.95);
    expect(flag!.recognitionRetrievability).toBe(0.2);
    expect(flag!.divergence).toBeCloseTo(0.75);
  });

  it("accepts a custom threshold", () => {
    expect(computeCrossTrackFlag(0.6, 0.5, { threshold: 0.05 })).not.toBeNull();
  });
});

describe("summarizeActivityTimeline", () => {
  // Noon in Europe/Amsterdam (UTC+2 in September) — safely mid-day, no risk
  // of a day-boundary edge case shifting which calendar day this lands on.
  const NOW = new Date("2026-09-02T10:00:00Z");
  const DAY_MS = 24 * 60 * 60 * 1000;

  it("returns `days` all-zero entries, oldest first, for no rows", () => {
    const days = summarizeActivityTimeline([], { now: NOW, days: 14 });
    expect(days).toHaveLength(14);
    for (const day of days) {
      expect(day.read).toBe(0);
      expect(day.review).toBe(0);
      expect(day.quiz).toBe(0);
    }
    expect(days[0]!.date < days[13]!.date).toBe(true);
    expect(days[13]!.date).toBe("2026-09-02");
  });

  it("buckets same-day events into their own category, combining pass/fail per track", () => {
    const days = summarizeActivityTimeline(
      [
        { event: "read", createdAt: NOW },
        { event: "review_pass", createdAt: NOW },
        { event: "review_fail", createdAt: NOW },
        { event: "quiz_pass", createdAt: NOW },
        { event: "quiz_fail", createdAt: NOW },
      ],
      { now: NOW, days: 14 },
    );
    const today = days[13]!;
    expect(today.read).toBe(1);
    expect(today.review).toBe(2);
    expect(today.quiz).toBe(2);
  });

  it("includes an event exactly at the window's oldest day", () => {
    const oldestMoment = new Date(NOW.getTime() - 13 * DAY_MS);
    const days = summarizeActivityTimeline([{ event: "read", createdAt: oldestMoment }], {
      now: NOW,
      days: 14,
    });
    expect(days[0]!.read).toBe(1);
  });

  it("excludes an event one day older than the window", () => {
    const tooOld = new Date(NOW.getTime() - 14 * DAY_MS);
    const days = summarizeActivityTimeline([{ event: "read", createdAt: tooOld }], {
      now: NOW,
      days: 14,
    });
    for (const day of days) expect(day.read).toBe(0);
  });

  it("ignores reveal events — not part of any of the three counted categories", () => {
    const days = summarizeActivityTimeline([{ event: "reveal", createdAt: NOW }], {
      now: NOW,
      days: 14,
    });
    const today = days[13]!;
    expect(today.read + today.review + today.quiz).toBe(0);
  });
});
