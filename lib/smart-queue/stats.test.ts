import { describe, expect, it } from "vitest";
import { computePoolStats } from "./stats";
import type { PickContext, ReviewCandidate } from "./types";

function makeCandidate(context: PickContext, ownCount: number): ReviewCandidate {
  const base: ReviewCandidate = {
    termId: "t1",
    domainId: "d1",
    createdAt: new Date(),
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

  if (context === "read") return { ...base, readCount: ownCount };
  if (context === "review") return { ...base, reviewRecallCount: ownCount };
  return { ...base, quizTestCount: ownCount };
}

describe("computePoolStats", () => {
  it("counts unseen vs seen per context", () => {
    const stats = computePoolStats(
      [makeCandidate("read", 0), makeCandidate("read", 1), makeCandidate("read", 2)],
      "read",
    );
    expect(stats).toEqual({ unseen: 1, seen: 2, total: 3, allSeenOnce: false });
  });

  it("allSeenOnce is true only when every candidate has been seen", () => {
    const stats = computePoolStats([makeCandidate("quiz", 1), makeCandidate("quiz", 3)], "quiz");
    expect(stats).toEqual({ unseen: 0, seen: 2, total: 2, allSeenOnce: true });
  });

  it("returns all-zero stats for an empty pool", () => {
    expect(computePoolStats([], "review")).toEqual({
      unseen: 0,
      seen: 0,
      total: 0,
      allSeenOnce: false,
    });
  });
});
