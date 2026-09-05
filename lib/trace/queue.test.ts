import { describe, expect, it } from "vitest";
import { rankQuizQueue, rankReadQueue, rankReviewQueue } from "./queue";
import type { TraceCandidate } from "./types";

function makeCandidate(overrides: Partial<TraceCandidate> = {}): TraceCandidate {
  return {
    termId: "t1",
    domainId: "d1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    readCount: 0,
    lastReadAt: null,
    recallStability: null,
    recallDifficulty: null,
    reviewRecallCount: 0,
    lastReviewRecallAt: null,
    quizKnowledgePosterior: null,
    quizTestCount: 0,
    lastQuizTestedAt: null,
    everMasteredAt: null,
    everLearningAt: null,
    ...overrides,
  };
}

const NOW = new Date("2026-02-01T00:00:00Z");

describe("rankReadQueue", () => {
  it("always includes every candidate (Read has no eligibility gate)", () => {
    const candidates = [makeCandidate({ termId: "a" }), makeCandidate({ termId: "b" })];
    expect(rankReadQueue(candidates, NOW)).toHaveLength(2);
  });

  it("ranks a stale-but-heavily-touched term ahead of a fresh-but-lightly-touched one", () => {
    const candidates = [
      // Read 10 times, but the last time was 60 days ago — exposure has decayed a lot.
      makeCandidate({
        termId: "stale",
        readCount: 10,
        lastReadAt: new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000),
      }),
      // Read once, just now — no decay yet.
      makeCandidate({ termId: "fresh", readCount: 1, lastReadAt: NOW }),
    ];
    // Raw read count alone would rank "fresh" first (1 < 10) — decay-aware
    // exposure correctly reverses that, since "stale" has faded the most.
    expect(rankReadQueue(candidates, NOW).map((c) => c.termId)).toEqual(["stale", "fresh"]);
  });

  it("no longer lets a zero-reads term tie for first once it's well-tested elsewhere", () => {
    const candidates = [
      // Never read, but confidently graded in Review several times.
      makeCandidate({
        termId: "known-elsewhere",
        readCount: 0,
        reviewRecallCount: 5,
        recallStability: 30,
        lastReviewRecallAt: NOW,
      }),
      // Completely untouched, anywhere.
      makeCandidate({ termId: "blank" }),
    ];
    expect(rankReadQueue(candidates, NOW).map((c) => c.termId)).toEqual([
      "blank",
      "known-elsewhere",
    ]);
  });

  it("still ranks a fully-untouched term first ahead of any term with signal", () => {
    const candidates = [
      makeCandidate({ termId: "touched", readCount: 1, lastReadAt: NOW }),
      makeCandidate({ termId: "blank" }),
    ];
    expect(rankReadQueue(candidates, NOW).map((c) => c.termId)).toEqual(["blank", "touched"]);
  });

  it("breaks ties by oldest createdAt first", () => {
    const candidates = [
      makeCandidate({ termId: "new", createdAt: new Date("2026-01-10") }),
      makeCandidate({ termId: "old", createdAt: new Date("2026-01-01") }),
    ];
    expect(rankReadQueue(candidates, NOW).map((c) => c.termId)).toEqual(["old", "new"]);
  });
});

describe("rankReviewQueue", () => {
  it("includes never-graded terms — otherwise no term could ever receive its first grade", () => {
    const candidates = [makeCandidate({ termId: "never-reviewed" })];
    expect(rankReviewQueue(candidates, NOW)).toHaveLength(1);
  });

  it("ranks never-graded terms ahead of every graded term, regardless of how weak", () => {
    const candidates = [
      makeCandidate({
        termId: "weak-but-graded",
        recallStability: 1,
        lastReviewRecallAt: new Date("2026-01-01"), // long ago, low stability => low R, but not null
      }),
      makeCandidate({ termId: "never-graded" }),
    ];
    expect(rankReviewQueue(candidates, NOW).map((c) => c.termId)).toEqual([
      "never-graded",
      "weak-but-graded",
    ]);
  });

  it("ranks by R_r(t) ascending — most at risk of forgetting first", () => {
    const candidates = [
      makeCandidate({
        termId: "strong",
        recallStability: 20,
        lastReviewRecallAt: new Date("2026-01-15"), // R ≈ 0.91, well under cooldown
      }),
      makeCandidate({
        termId: "weak",
        recallStability: 1,
        lastReviewRecallAt: new Date("2026-01-01"), // long ago, low stability => low R
      }),
    ];
    expect(rankReviewQueue(candidates, NOW).map((c) => c.termId)).toEqual(["weak", "strong"]);
  });

  it("applies the session cooldown — excludes R(t) > 0.98 — but never touches never-graded terms", () => {
    const candidates = [
      makeCandidate({
        termId: "just-passed",
        recallStability: 1000,
        lastReviewRecallAt: NOW, // t=0 => R=1, above cooldown
      }),
      makeCandidate({
        termId: "due",
        recallStability: 1,
        lastReviewRecallAt: new Date("2026-01-01"),
      }),
      makeCandidate({ termId: "never-graded" }),
    ];
    const ranked = rankReviewQueue(candidates, NOW);
    expect(ranked.map((c) => c.termId)).toEqual(["never-graded", "due"]);
  });
});

describe("rankQuizQueue", () => {
  it("includes never-answered terms — otherwise no term could ever get its first answer", () => {
    const candidates = [makeCandidate({ termId: "never-quizzed" })];
    expect(rankQuizQueue(candidates, NOW)).toHaveLength(1);
  });

  it("ranks never-answered terms ahead of every answered term", () => {
    const candidates = [
      makeCandidate({
        termId: "confident-but-answered",
        quizKnowledgePosterior: 0.95,
        lastQuizTestedAt: new Date("2026-01-15"),
      }),
      makeCandidate({ termId: "never-answered" }),
    ];
    expect(rankQuizQueue(candidates, NOW).map((c) => c.termId)).toEqual([
      "never-answered",
      "confident-but-answered",
    ]);
  });

  it("ranks by R_g(t) ascending", () => {
    const candidates = [
      makeCandidate({
        termId: "confident",
        quizKnowledgePosterior: 0.95,
        lastQuizTestedAt: new Date("2026-01-15"), // R ≈ 0.89, well under cooldown
      }),
      makeCandidate({
        termId: "shaky",
        quizKnowledgePosterior: 0.1,
        lastQuizTestedAt: new Date("2026-01-01"),
      }),
    ];
    expect(rankQuizQueue(candidates, NOW).map((c) => c.termId)).toEqual(["shaky", "confident"]);
  });
});
