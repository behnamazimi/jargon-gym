import { describe, expect, it } from "vitest";
import { pickQuizTerms } from "./pick";
import type { ReviewCandidate } from "./types";

const HOUR = 60 * 60 * 1000;

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * HOUR);
}

/** Base fixture: a never-quizzed known term, no engagement at all. Override
 *  fields per test to move a candidate between tier-1's two sub-groups, or
 *  into tier 2/3. */
function makeCandidate(
  termId: string,
  overrides: Partial<ReviewCandidate> = {},
): ReviewCandidate {
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

describe("pickQuizTerms tier 1: risk-ordered never-quizzed backlog", () => {
  it("a zero-engagement candidate sorts before an engaged one, even with a later known_at", () => {
    const engagedButOlder = makeCandidate("engaged-older", {
      readCount: 3,
      reviewRecallCount: 1,
      knownAt: hoursAgo(500), // known first
    });
    const unverifiedButNewer = makeCandidate("unverified-newer", {
      knownAt: hoursAgo(10), // known much more recently
    });

    const result = pickQuizTerms([engagedButOlder, unverifiedButNewer], 2);

    expect(result.map((c) => c.termId)).toEqual(["unverified-newer", "engaged-older"]);
  });

  it("within the zero-engagement group, still orders by known_at ascending", () => {
    const oldest = makeCandidate("unverified-oldest", { knownAt: hoursAgo(300) });
    const middle = makeCandidate("unverified-middle", { knownAt: hoursAgo(200) });
    const newest = makeCandidate("unverified-newest", { knownAt: hoursAgo(100) });

    const result = pickQuizTerms([newest, oldest, middle], 3);

    expect(result.map((c) => c.termId)).toEqual([
      "unverified-oldest",
      "unverified-middle",
      "unverified-newest",
    ]);
  });

  it("within the engaged group, still orders by known_at ascending (regression: old behavior preserved)", () => {
    const oldest = makeCandidate("engaged-oldest", { readCount: 1, knownAt: hoursAgo(300) });
    const middle = makeCandidate("engaged-middle", {
      reviewRecallCount: 1,
      knownAt: hoursAgo(200),
    });
    const newest = makeCandidate("engaged-newest", { readCount: 2, knownAt: hoursAgo(100) });

    const result = pickQuizTerms([newest, oldest, middle], 3);

    expect(result.map((c) => c.termId)).toEqual(["engaged-oldest", "engaged-middle", "engaged-newest"]);
  });

  it("a read-only or review-only engagement is enough to leave the unverified group", () => {
    const readOnly = makeCandidate("read-only", { readCount: 1, knownAt: hoursAgo(500) });
    const reviewOnly = makeCandidate("review-only", {
      reviewRecallCount: 1,
      knownAt: hoursAgo(400),
    });
    const unverified = makeCandidate("unverified", { knownAt: hoursAgo(1) });

    const result = pickQuizTerms([readOnly, reviewOnly, unverified], 3);

    // unverified (no engagement) leads, then the two engaged terms in their
    // own known_at order (read-only known first, so it sorts first within
    // the engaged group) — engagement type (read vs. review) doesn't matter,
    // only whether there's any at all.
    expect(result.map((c) => c.termId)).toEqual(["unverified", "read-only", "review-only"]);
  });

  it("tier 2 and tier 3 are unaffected — only tier 1's internal order changed", () => {
    const tier1Engaged = makeCandidate("tier1-engaged", {
      readCount: 5,
      knownAt: hoursAgo(50),
    });
    const tier1Unverified = makeCandidate("tier1-unverified", { knownAt: hoursAgo(20) });
    // Tier 2: tested before, struggling (negative streak never triggers mastered_cooldown).
    const tier2 = makeCandidate("tier2-struggling", {
      quizTestCount: 3,
      quizStreak: -1,
      lastQuizTestedAt: hoursAgo(10 * 24),
    });
    // Tier 3: tested before, just passed, well inside its mastered-cooldown window.
    const tier3 = makeCandidate("tier3-mastered", {
      quizTestCount: 2,
      quizStreak: 1,
      lastQuizTestedAt: hoursAgo(1),
    });

    const result = pickQuizTerms([tier3, tier2, tier1Engaged, tier1Unverified], 4);

    expect(result.map((c) => c.termId)).toEqual([
      "tier1-unverified",
      "tier1-engaged",
      "tier2-struggling",
      "tier3-mastered",
    ]);
  });
});
