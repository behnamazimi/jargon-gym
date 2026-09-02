import { describe, expect, it } from "vitest";
import { GOOD, SESSION_COOLDOWN_RETRIEVABILITY } from "./constants";
import {
  applyQuizAnswer,
  applyReadEvent,
  applyReviewGrade,
  computeTraceSnapshot,
  daysUntilCooldownClears,
} from "./index";
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

describe("daysUntilCooldownClears", () => {
  const NOW = new Date("2026-09-02T12:00:00Z");

  it("returns null for an untested recall track — cooldown never applies", () => {
    const result = daysUntilCooldownClears(
      {
        recallStability: null,
        lastReviewRecallAt: null,
        quizKnowledgePosterior: null,
        lastQuizTestedAt: null,
      },
      "recall",
      NOW,
    );
    expect(result).toBeNull();
  });

  it("returns null for an untested recognition track — cooldown never applies", () => {
    const result = daysUntilCooldownClears(
      {
        recallStability: null,
        lastReviewRecallAt: null,
        quizKnowledgePosterior: null,
        lastQuizTestedAt: null,
      },
      "recognition",
      NOW,
    );
    expect(result).toBeNull();
  });

  it("returns null once retrievability has already decayed to the cooldown threshold or below", () => {
    // Enough elapsed time that recall retrievability has clearly dropped
    // under SESSION_COOLDOWN_RETRIEVABILITY for a modest stability.
    const result = daysUntilCooldownClears(
      {
        recallStability: 5,
        lastReviewRecallAt: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000),
        quizKnowledgePosterior: null,
        lastQuizTestedAt: null,
      },
      "recall",
      NOW,
    );
    expect(result).toBeNull();
  });

  it("returns a positive number matching the closed-form inversion right after a fresh grade", () => {
    const stability = 5;
    const result = daysUntilCooldownClears(
      {
        recallStability: stability,
        lastReviewRecallAt: NOW,
        quizKnowledgePosterior: null,
        lastQuizTestedAt: null,
      },
      "recall",
      NOW,
    );
    const expected = 9 * stability * (1 / SESSION_COOLDOWN_RETRIEVABILITY - 1);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(expected, 5);
    expect(result!).toBeGreaterThan(0);
  });

  it("derives recognition stability from the posterior via posteriorToStability", () => {
    const result = daysUntilCooldownClears(
      {
        recallStability: null,
        lastReviewRecallAt: null,
        quizKnowledgePosterior: 0.8,
        lastQuizTestedAt: NOW,
      },
      "recognition",
      NOW,
    );
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });
});
