import { describe, expect, it } from "vitest";
import {
  AGAIN,
  EASY,
  GOOD,
  HARD,
  LAPSE_AGAIN_DUE_RETRIEVABILITY,
  LAPSE_HARD_DUE_RETRIEVABILITY,
  UNTESTED_RETRIEVABILITY,
} from "./constants";
import {
  rankQuizQueue,
  rankReadQueue,
  rankReviewQueue,
  recallRetrievabilityNow,
  reviewDueLine,
  reviewSortKey,
} from "./queue";
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
    lastReviewGrade: null,
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
        recallStability: 20,
        lastReviewRecallAt: new Date("2026-01-15"), // R ≈ 0.91, above UNTESTED_RETRIEVABILITY
      }),
      makeCandidate({ termId: "never-graded" }),
    ];
    expect(recallRetrievabilityNow(candidates[0]!, NOW)).toBeGreaterThan(UNTESTED_RETRIEVABILITY);
    expect(rankReviewQueue(candidates, NOW).map((c) => c.termId)).toEqual([
      "never-graded",
      "holding",
    ]);
  });

  it("breaks a tie at the untested line by oldest term first", () => {
    // R = 1 / (1 + t / (9·S)) equals the line after 9 days when S = p / (1 − p).
    const stability = UNTESTED_RETRIEVABILITY / (1 - UNTESTED_RETRIEVABILITY);
    const atTheLine = makeCandidate({
      termId: "learned",
      createdAt: new Date("2026-01-02"),
      recallStability: stability,
      lastReviewRecallAt: new Date(NOW.getTime() - 9 * 24 * 60 * 60 * 1000),
    });
    expect(recallRetrievabilityNow(atTheLine, NOW)).toBeCloseTo(UNTESTED_RETRIEVABILITY, 10);

    const older = makeCandidate({ termId: "never-graded", createdAt: new Date("2026-01-01") });
    expect(rankReviewQueue([atTheLine, older], NOW).map((c) => c.termId)).toEqual([
      "never-graded",
      "learned",
    ]);
    const newer = makeCandidate({ termId: "never-graded", createdAt: new Date("2026-01-03") });
    expect(rankReviewQueue([newer, atTheLine], NOW).map((c) => c.termId)).toEqual([
      "learned",
      "never-graded",
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
    expect(ranked.map((c) => c.termId)).toEqual(["due", "never-graded"]);
  });
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** A graded term whose retrievability right now is `r` (stability 1, so t = 9·(1/r − 1) days). */
function gradedAt(r: number, overrides: Partial<TraceCandidate> = {}): TraceCandidate {
  return makeCandidate({
    recallStability: 1,
    lastReviewRecallAt: new Date(NOW.getTime() - 9 * (1 / r - 1) * DAY_MS),
    ...overrides,
  });
}

describe("reviewDueLine", () => {
  it("is the untested line unless the last grade was Again or Hard", () => {
    expect(reviewDueLine({ lastReviewGrade: null })).toBe(UNTESTED_RETRIEVABILITY);
    expect(reviewDueLine({ lastReviewGrade: GOOD })).toBe(UNTESTED_RETRIEVABILITY);
    expect(reviewDueLine({ lastReviewGrade: EASY })).toBe(UNTESTED_RETRIEVABILITY);
    expect(reviewDueLine({ lastReviewGrade: AGAIN })).toBe(LAPSE_AGAIN_DUE_RETRIEVABILITY);
    expect(reviewDueLine({ lastReviewGrade: HARD })).toBe(LAPSE_HARD_DUE_RETRIEVABILITY);
  });
});

describe("rankReviewQueue lapse lane", () => {
  const order = (candidates: TraceCandidate[]) =>
    rankReviewQueue(candidates, NOW).map((c) => c.termId);

  it("puts an Again term below the Again line ahead of never-graded terms", () => {
    const lapsed = gradedAt(0.78, { termId: "lapsed", lastReviewGrade: AGAIN });
    const fresh = makeCandidate({ termId: "never-graded" });
    expect(order([fresh, lapsed])).toEqual(["lapsed", "never-graded"]);
  });

  it("leaves the same term behind never-graded terms when it was graded Good", () => {
    const passed = gradedAt(0.78, { termId: "passed", lastReviewGrade: GOOD });
    const fresh = makeCandidate({ termId: "never-graded" });
    expect(order([passed, fresh])).toEqual(["never-graded", "passed"]);
  });

  it("uses a lower line for Hard than for Again", () => {
    const fresh = makeCandidate({ termId: "never-graded" });
    const hardAt75 = gradedAt(0.75, { termId: "hard-75", lastReviewGrade: HARD });
    const hardAt80 = gradedAt(0.8, { termId: "hard-80", lastReviewGrade: HARD });
    const againAt80 = gradedAt(0.8, { termId: "again-80", lastReviewGrade: AGAIN });
    expect(order([fresh, hardAt75, hardAt80, againAt80])).toEqual([
      "hard-75",
      "again-80",
      "never-graded",
      "hard-80",
    ]);
  });

  it("sorts a lane term at its line level with never-graded terms, and just either side of it correctly", () => {
    const line = LAPSE_AGAIN_DUE_RETRIEVABILITY;
    const atLine = gradedAt(line, { termId: "at-line", lastReviewGrade: AGAIN });
    expect(reviewSortKey(atLine, NOW)).toBeCloseTo(UNTESTED_RETRIEVABILITY, 10);

    const fresh = makeCandidate({ termId: "never-graded" });
    const justBelow = gradedAt(line - 0.005, { termId: "below", lastReviewGrade: AGAIN });
    const justAbove = gradedAt(line + 0.005, { termId: "above", lastReviewGrade: AGAIN });
    expect(order([justAbove, fresh, justBelow])).toEqual(["below", "never-graded", "above"]);
  });

  it("orders two lane terms by how far each is past its own line", () => {
    const worse = gradedAt(0.6, { termId: "worse", lastReviewGrade: AGAIN });
    const better = gradedAt(0.75, { termId: "better", lastReviewGrade: AGAIN });
    expect(order([better, worse])).toEqual(["worse", "better"]);
  });

  it("does not let a lane term jump a normal term that is more at risk", () => {
    const lane = gradedAt(0.8, { termId: "lane", lastReviewGrade: AGAIN });
    const normal = gradedAt(0.65, { termId: "normal", lastReviewGrade: GOOD });
    expect(order([lane, normal])).toEqual(["normal", "lane"]);
  });

  it("still holds a lane term out above the cooldown", () => {
    const justGraded = makeCandidate({
      termId: "just-graded",
      recallStability: 1000,
      lastReviewRecallAt: NOW,
      lastReviewGrade: AGAIN,
    });
    const fresh = makeCandidate({ termId: "never-graded" });
    expect(order([justGraded, fresh])).toEqual(["never-graded"]);
  });

  it("does not promote a lane term that is still well above its line", () => {
    const holding = gradedAt(0.9, { termId: "holding", lastReviewGrade: AGAIN });
    const fresh = makeCandidate({ termId: "never-graded" });
    expect(order([holding, fresh])).toEqual(["never-graded", "holding"]);
  });

  it("ignores a grade on a term that was never graded in Review", () => {
    const odd = makeCandidate({ termId: "odd", lastReviewGrade: AGAIN });
    const other = makeCandidate({ termId: "other", createdAt: new Date("2026-01-02") });
    expect(order([other, odd])).toEqual(["odd", "other"]);
  });

  it("leaves Quiz ranking alone", () => {
    const lapsed = makeCandidate({ termId: "lapsed", lastReviewGrade: AGAIN });
    const fresh = makeCandidate({ termId: "fresh", createdAt: new Date("2026-01-02") });
    expect(rankQuizQueue([fresh, lapsed], NOW).map((c) => c.termId)).toEqual(["lapsed", "fresh"]);
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
        lastQuizTestedAt: new Date("2026-01-15"), // R ≈ 0.89
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
        lastQuizTestedAt: new Date("2026-01-15"),
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
