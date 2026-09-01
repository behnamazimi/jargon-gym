import { describe, expect, it } from "vitest";
import {
  computeAttentionFlag,
  findAbandonedReveals,
  summarizeCalibration,
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
