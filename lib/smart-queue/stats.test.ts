import { describe, expect, it } from "vitest";
import { computePoolStats } from "./stats";
import { RANKING } from "./weights";
import type { PickContext, ReviewCandidate } from "./types";

const HOUR = 60 * 60 * 1000;
const now = new Date();

function hoursAgo(hours: number): Date {
  return new Date(now.getTime() - hours * HOUR);
}

function makeCandidate(context: PickContext, ownHours: number, streak = 1): ReviewCandidate {
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
    return { ...base, readCount: 1, lastReadAt: hoursAgo(ownHours) };
  }
  if (context === "review") {
    return {
      ...base,
      reviewRecallCount: Math.abs(streak) + 1,
      lastReviewRecallAt: hoursAgo(ownHours),
      reviewStreak: streak,
    };
  }
  return {
    ...base,
    quizTestCount: Math.abs(streak) + 1,
    lastQuizTestedAt: hoursAgo(ownHours),
    quizStreak: streak,
  };
}

describe("computePoolStats stale bucket matches shouldAttachStaleReason", () => {
  it("Read: yesterday is recent; 7-day cap is stale", () => {
    const recent = computePoolStats([makeCandidate("read", 25)], "read", now);
    const stale = computePoolStats(
      [makeCandidate("read", RANKING.formula.stalenessCapHours)],
      "read",
      now,
    );
    expect(recent).toMatchObject({ seen: 1, stale: 0, recent: 1 });
    expect(stale).toMatchObject({ seen: 1, stale: 1, recent: 0 });
  });

  it("Review: in mastered cooldown past τ counts as recent, not stale", () => {
    const stats = computePoolStats(
      [makeCandidate("review", RANKING.stalenessDecayHours.review, 1)],
      "review",
      now,
    );
    expect(stats).toMatchObject({ seen: 1, stale: 0, recent: 1 });
  });

  it("Quiz: struggling at τ counts as stale", () => {
    const stats = computePoolStats(
      [makeCandidate("quiz", RANKING.stalenessDecayHours.quiz, -1)],
      "quiz",
      now,
    );
    expect(stats).toMatchObject({ seen: 1, stale: 1, recent: 0, struggling: 1 });
  });
});
