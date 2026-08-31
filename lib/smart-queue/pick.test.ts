import { describe, expect, it } from "vitest";
import {
  originOf,
  pickMixedReviewTerms,
  pickQuizTerms,
  pickRandom,
  pickStaleKnownTerms,
  pickTerms,
} from "./pick";
import type { ReviewCandidate } from "./types";

function makeCandidate(termId: string, knownAt: Date | null = null): ReviewCandidate {
  return {
    termId,
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
    knownAt,
  };
}

describe("pickRandom", () => {
  it("returns an empty array for an empty pool", () => {
    expect(pickRandom([], 5)).toEqual([]);
  });

  it("returns an empty array for a non-positive limit", () => {
    expect(pickRandom([1, 2, 3], 0)).toEqual([]);
    expect(pickRandom([1, 2, 3], -1)).toEqual([]);
  });

  it("returns every item, reordered, when the pool is smaller than the limit", () => {
    const items = [1, 2, 3];
    const result = pickRandom(items, 10);
    expect(result).toHaveLength(3);
    expect(result.slice().sort()).toEqual(items);
  });

  it("respects the limit and never duplicates an item", () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const result = pickRandom(items, 10);
    expect(result).toHaveLength(10);
    expect(new Set(result).size).toBe(10);
    for (const item of result) expect(items).toContain(item);
  });

  it("does not mutate the input array", () => {
    const items = [1, 2, 3, 4, 5];
    const copy = [...items];
    pickRandom(items, 3);
    expect(items).toEqual(copy);
  });
});

describe("pick.ts wrappers", () => {
  const candidates = Array.from({ length: 20 }, (_, i) => makeCandidate(`t${i}`));

  it("pickTerms slices to the limit", () => {
    expect(pickTerms(candidates, 5)).toHaveLength(5);
  });

  it("pickQuizTerms slices to the limit", () => {
    expect(pickQuizTerms(candidates, 5)).toHaveLength(5);
  });

  it("pickStaleKnownTerms slices to the limit", () => {
    expect(pickStaleKnownTerms(candidates, 5)).toHaveLength(5);
  });

  it("pickMixedReviewTerms combines both pools without a fixed ratio", () => {
    const unknown = Array.from({ length: 3 }, (_, i) => makeCandidate(`u${i}`, null));
    const known = Array.from({ length: 17 }, (_, i) => makeCandidate(`k${i}`, new Date()));
    const result = pickMixedReviewTerms(unknown, known, 10);
    expect(result).toHaveLength(10);
  });

  it("originOf derives pool from knownAt", () => {
    expect(originOf(makeCandidate("a", null))).toBe("unknown");
    expect(originOf(makeCandidate("a", new Date()))).toBe("known");
  });
});
