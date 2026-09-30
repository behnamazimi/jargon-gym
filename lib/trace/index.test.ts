import { describe, expect, it } from "vitest";
import { GOOD } from "./constants";
import { applyQuizAnswer, applyReadEvent, applyReviewGrade, computeTraceSnapshot } from "./index";
import type { TraceState } from "./types";

function emptyState(): TraceState {
  return {
    readCount: 0,
    lastReadAt: null,
    recallStability: null,
    recallDifficulty: null,
    reviewRecallCount: 0,
    lastReviewRecallAt: null,
    quizKnowledgePosterior: null,
    quizTestCount: 0,
    lastQuizTestedAt: null,
  };
}

describe("computeTraceSnapshot", () => {
  it("a never-touched term has zero familiarity, no retrievability, mastery 0, and label unknown", () => {
    const snapshot = computeTraceSnapshot(emptyState(), new Date());
    expect(snapshot.familiarity).toBe(0);
    expect(snapshot.recallRetrievability).toBeNull();
    expect(snapshot.recognitionRetrievability).toBeNull();
    expect(snapshot.mastery).toBe(0);
    expect(snapshot.knownLabel).toBe("unknown");
  });
});

describe("applyReadEvent", () => {
  it("bumps read count and sets last read to now", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = applyReadEvent({ readCount: 2 }, now);
    expect(result.readCount).toBe(3);
    expect(result.lastReadAt).toBe(now);
  });
});

describe("applyReviewGrade end-to-end", () => {
  it("first grade on a never-read term ignores familiarity entirely", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const state = emptyState();
    const result = applyReviewGrade(state, GOOD, now);
    expect(result.recallStability).toBeGreaterThan(0);
    expect(result.recallDifficulty).toBeGreaterThanOrEqual(1);
  });

  it("prior Read history nudges the cold-start grade via familiarity", () => {
    const readAt = new Date("2026-01-01T00:00:00Z");
    const gradeAt = new Date("2026-01-01T00:00:00Z"); // same moment, no decay
    const unread = applyReviewGrade(emptyState(), GOOD, gradeAt);
    const wellRead = applyReviewGrade(
      { ...emptyState(), readCount: 5, lastReadAt: readAt },
      GOOD,
      gradeAt,
    );
    expect(wellRead.recallStability).toBeGreaterThan(unread.recallStability);
    expect(wellRead.recallDifficulty).toBeLessThan(unread.recallDifficulty);
  });
});

describe("applyQuizAnswer end-to-end", () => {
  it("a correct answer on an untested term raises the posterior above the 0.5 starting prior", () => {
    const result = applyQuizAnswer(
      { quizKnowledgePosterior: null, recallStability: null, lastReviewRecallAt: null },
      true,
      "multiple_choice",
      new Date(),
    );
    expect(result.quizKnowledgePosterior).toBeGreaterThan(0.5);
  });
});
