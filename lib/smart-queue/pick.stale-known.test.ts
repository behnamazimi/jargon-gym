import { describe, expect, it } from "vitest";
import { pickStaleKnownTerms } from "./pick";
import type { ReviewCandidate } from "./types";

const HOUR = 60 * 60 * 1000;

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * HOUR);
}

/** Base fixture: a known term with no read history at all. Override fields
 *  per test to give it a lastReadAt/readCount. */
function makeCandidate(termId: string, overrides: Partial<ReviewCandidate> = {}): ReviewCandidate {
  return {
    termId,
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
    knownAt: hoursAgo(1000),
    ...overrides,
  };
}

describe("pickStaleKnownTerms", () => {
  it("orders by lastReadAt ascending — the term read longest ago comes first", () => {
    const readRecently = makeCandidate("read-recently", { lastReadAt: hoursAgo(1), readCount: 5 });
    const readLongAgo = makeCandidate("read-long-ago", { lastReadAt: hoursAgo(500), readCount: 2 });
    const readAWhileAgo = makeCandidate("read-a-while-ago", {
      lastReadAt: hoursAgo(100),
      readCount: 3,
    });

    const result = pickStaleKnownTerms([readRecently, readLongAgo, readAWhileAgo], 3);

    expect(result.map((c) => c.termId)).toEqual([
      "read-long-ago",
      "read-a-while-ago",
      "read-recently",
    ]);
  });

  it("a never-read known term (null lastReadAt) sorts ahead of any term that has been read", () => {
    const readOnceLongAgo = makeCandidate("read-once-long-ago", {
      lastReadAt: hoursAgo(2000),
      readCount: 1,
    });
    const neverRead = makeCandidate("never-read", { lastReadAt: null, readCount: 0 });

    const result = pickStaleKnownTerms([readOnceLongAgo, neverRead], 2);

    expect(result.map((c) => c.termId)).toEqual(["never-read", "read-once-long-ago"]);
  });

  it("breaks a lastReadAt tie by readCount ascending", () => {
    const tiedTime = hoursAgo(50);
    const readMore = makeCandidate("read-more", { lastReadAt: tiedTime, readCount: 8 });
    const readFewer = makeCandidate("read-fewer", { lastReadAt: tiedTime, readCount: 2 });

    const result = pickStaleKnownTerms([readMore, readFewer], 2);

    expect(result.map((c) => c.termId)).toEqual(["read-fewer", "read-more"]);
  });

  it("multiple never-read terms tie-break by readCount too (both 0, order preserved by stable input)", () => {
    const a = makeCandidate("a", { lastReadAt: null, readCount: 0 });
    const b = makeCandidate("b", { lastReadAt: null, readCount: 0 });

    const result = pickStaleKnownTerms([a, b], 2);

    expect(result.map((c) => c.termId).sort()).toEqual(["a", "b"]);
  });

  it("slices to the requested limit", () => {
    const candidates = [
      makeCandidate("c1", { lastReadAt: hoursAgo(1) }),
      makeCandidate("c2", { lastReadAt: hoursAgo(2) }),
      makeCandidate("c3", { lastReadAt: hoursAgo(3) }),
    ];

    const result = pickStaleKnownTerms(candidates, 2);

    expect(result).toHaveLength(2);
    expect(result.map((c) => c.termId)).toEqual(["c3", "c2"]);
  });

  it("returns an empty array for no candidates or a non-positive limit", () => {
    expect(pickStaleKnownTerms([], 5)).toEqual([]);
    expect(pickStaleKnownTerms([makeCandidate("x")], 0)).toEqual([]);
  });

  it("assigns score 0 and no reasons — this path never runs the score engine", () => {
    const result = pickStaleKnownTerms([makeCandidate("x", { lastReadAt: hoursAgo(1) })], 1);

    expect(result[0]?.score).toBe(0);
    expect(result[0]?.reasons).toEqual([]);
  });
});
