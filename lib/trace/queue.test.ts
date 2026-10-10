import { describe, expect, it } from "vitest";
import { UNTESTED_RETRIEVABILITY } from "./constants";
import { rankQuizQueue, rankReadQueue, rankReviewQueue, recallRetrievabilityNow } from "./queue";
import type { TraceCandidate } from "./types";

function makeCandidate(overrides: Partial<TraceCandidate> = {}): TraceCandidate {
  return {
    termId: "t1",
    collectionId: "d1",
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
    markedKnownAt: null,
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

  it("ranks a graded term that has decayed below the untested line ahead of never-graded terms", () => {
    const candidates = [
      makeCandidate({ termId: "never-graded" }),
      makeCandidate({
        termId: "decayed",
        recallStability: 1,
        lastReviewRecallAt: new Date("2026-01-01"), // R ≈ 0.23, well under UNTESTED_RETRIEVABILITY
      }),
    ];
    expect(recallRetrievabilityNow(candidates[1]!, NOW)).toBeLessThan(UNTESTED_RETRIEVABILITY);
    expect(rankReviewQueue(candidates, NOW).map((c) => c.termId)).toEqual([
      "decayed",
      "never-graded",
    ]);
  });

  it("ranks never-graded terms ahead of graded terms still above the untested line", () => {
    const candidates = [
      makeCandidate({
        termId: "holding",
        recallStability: 60,
        lastReviewRecallAt: new Date("2026-01-15"), // R ≈ 0.97, above UNTESTED_RETRIEVABILITY
      }),
      makeCandidate({ termId: "never-graded" }),
    ];
    expect(recallRetrievabilityNow(candidates[0]!, NOW)).toBeGreaterThan(UNTESTED_RETRIEVABILITY);
    expect(rankReviewQueue(candidates, NOW).map((c) => c.termId)).toEqual([
      "never-graded",
      "holding",
    ]);
  });

  it("puts a learned term on the right side of the untested line whatever its age", () => {
    // R = 1 / (1 + t / (9·S)): after 9 days it is just under the line when S is
    // a little below p / (1 − p), and just over it when S is a little above.
    const lineStability = UNTESTED_RETRIEVABILITY / (1 - UNTESTED_RETRIEVABILITY);
    const learnedAt = (stability: number) =>
      makeCandidate({
        termId: "learned",
        createdAt: new Date("2026-01-03"),
        recallStability: stability,
        lastReviewRecallAt: new Date(NOW.getTime() - 9 * 24 * 60 * 60 * 1000),
      });
    const neverGraded = makeCandidate({
      termId: "never-graded",
      createdAt: new Date("2026-01-01"),
    });

    expect(
      rankReviewQueue([neverGraded, learnedAt(lineStability * 0.99)], NOW).map((c) => c.termId),
    ).toEqual(["learned", "never-graded"]);
    expect(
      rankReviewQueue([neverGraded, learnedAt(lineStability * 1.01)], NOW).map((c) => c.termId),
    ).toEqual(["never-graded", "learned"]);
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
    expect(ranked.map((c) => c.termId)).toEqual(["due", "never-graded"]);
  });
});

describe("rankReviewQueue cooldown with the untested line", () => {
  it("holds out a just-graded term, then serves decayed before never-graded", () => {
    const candidates = [
      makeCandidate({ termId: "never-graded" }),
      makeCandidate({ termId: "just-passed", recallStability: 1000, lastReviewRecallAt: NOW }),
      makeCandidate({
        termId: "decayed",
        recallStability: 1,
        lastReviewRecallAt: new Date("2026-01-01"),
      }),
    ];
    expect(rankReviewQueue(candidates, NOW).map((c) => c.termId)).toEqual([
      "decayed",
      "never-graded",
    ]);
  });
});

describe("rankQuizQueue", () => {
  it("includes never-answered terms — otherwise no term could ever get its first answer", () => {
    const candidates = [makeCandidate({ termId: "never-quizzed" })];
    expect(rankQuizQueue(candidates, NOW)).toHaveLength(1);
  });

  it("ranks never-answered terms ahead of answered terms still above the untested line", () => {
    const candidates = [
      makeCandidate({
        termId: "confident-but-answered",
        quizKnowledgePosterior: 0.95,
        lastQuizTestedAt: new Date("2026-01-26"), // R ≈ 0.96
      }),
      makeCandidate({ termId: "never-answered" }),
    ];
    expect(rankQuizQueue(candidates, NOW).map((c) => c.termId)).toEqual([
      "never-answered",
      "confident-but-answered",
    ]);
  });

  it("treats a term graded in Review but never quizzed as untested in Quiz", () => {
    const candidates = [
      makeCandidate({
        termId: "answered-holding",
        quizKnowledgePosterior: 0.95,
        lastQuizTestedAt: new Date("2026-01-26"),
      }),
      makeCandidate({
        termId: "reviewed-only",
        recallStability: 20,
        lastReviewRecallAt: new Date("2026-01-30"),
      }),
    ];
    expect(rankQuizQueue(candidates, NOW).map((c) => c.termId)).toEqual([
      "reviewed-only",
      "answered-holding",
    ]);
  });

  it("ranks an answered term that has decayed below the untested line ahead of never-answered terms", () => {
    const candidates = [
      makeCandidate({ termId: "never-answered" }),
      makeCandidate({
        termId: "faded",
        quizKnowledgePosterior: 0.2,
        lastQuizTestedAt: new Date("2026-01-01"), // S = 4, R ≈ 0.54
      }),
    ];
    expect(rankQuizQueue(candidates, NOW).map((c) => c.termId)).toEqual([
      "faded",
      "never-answered",
    ]);
  });

  it("ranks by R_g(t) ascending", () => {
    const candidates = [
      makeCandidate({
        termId: "confident",
        quizKnowledgePosterior: 0.95,
        lastQuizTestedAt: new Date("2026-01-26"), // R ≈ 0.96, well under cooldown
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
