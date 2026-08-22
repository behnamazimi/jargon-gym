import { describe, expect, it } from "vitest";
import { reducePipelineHints } from "./next-best-action";
import type { ReviewCandidate } from "./types";

const now = new Date();
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

function hoursAgo(hours: number): Date {
  return new Date(now.getTime() - hours * HOUR);
}

function minutesAgo(minutes: number): Date {
  return new Date(now.getTime() - minutes * MINUTE);
}

/** Minimal candidate factory — every field defaults to "never touched";
 *  pass overrides to model a specific pool member. */
function makeCandidate(overrides: Partial<ReviewCandidate> = {}): ReviewCandidate {
  return {
    termId: `t-${Math.random()}`,
    domainId: "domain-a",
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
    ...overrides,
  };
}

/** Read, reviewed, and quizzed recently with a positive streak on both test
 *  activities — has no not-started/pace signal in any of the three stages,
 *  the "fully healthy" baseline. */
function healthyCandidate(): ReviewCandidate {
  return makeCandidate({
    readCount: 3,
    lastReadAt: hoursAgo(2),
    reviewRecallCount: 3,
    lastReviewRecallAt: hoursAgo(2),
    reviewStreak: 2,
    quizTestCount: 3,
    lastQuizTestedAt: hoursAgo(2),
    quizStreak: 2,
  });
}

function neverReadCandidates(count: number): ReviewCandidate[] {
  return Array.from({ length: count }, () => makeCandidate());
}

describe("reducePipelineHints", () => {
  it("flags read ahead of review and quiz when nothing has been read yet", () => {
    const hints = reducePipelineHints(neverReadCandidates(3), [], now);

    expect(hints[0]?.context).toBe("read");
    expect(hints[0]?.message).toBe("There are terms you haven't read yet");
  });

  it("keeps pipeline order even when review also needs attention", () => {
    // unknown pool never read; known pool never reviewed/quizzed.
    const hints = reducePipelineHints(neverReadCandidates(2), neverReadCandidates(2), now);

    expect(hints.map((h) => h.context)).toEqual(["read", "review", "quiz"]);
  });

  it("flags a pace problem once everything has been touched at least once", () => {
    // A single term per pool, touched but with a negative review streak —
    // no never-touched signal, but review is struggling ("pace").
    const struggling = makeCandidate({
      readCount: 1,
      lastReadAt: hoursAgo(2),
      reviewRecallCount: 3,
      lastReviewRecallAt: hoursAgo(2),
      reviewStreak: -2,
      quizTestCount: 1,
      lastQuizTestedAt: hoursAgo(2),
      quizStreak: 1,
    });

    const hints = reducePipelineHints([], [struggling], now);
    const review = hints.find((h) => h.context === "review");

    expect(review?.message).toBe("Your review pace has slipped");
  });

  it("carries no domain name or term count in the output", () => {
    const hints = reducePipelineHints(neverReadCandidates(12), [], now);

    for (const hint of hints) {
      expect(hint.message).not.toMatch(/\d/);
    }
  });

  it("never surfaces a fully healthy pipeline", () => {
    const hints = reducePipelineHints([], [healthyCandidate()], now);

    expect(hints).toEqual([]);
  });

  it("returns nothing for an empty candidate set", () => {
    expect(reducePipelineHints([], [], now)).toEqual([]);
  });

  it("suppresses not_started while the user is mid-session on that pool", () => {
    // 2 of 3 read moments ago; the third has never been read — still a
    // real backlog, but the user is actively chipping away at it right now.
    const midSessionRead = [
      makeCandidate({ readCount: 1, lastReadAt: minutesAgo(2) }),
      makeCandidate({ readCount: 1, lastReadAt: minutesAgo(5) }),
      makeCandidate(), // never read
    ];

    const hints = reducePipelineHints(midSessionRead, [], now);

    expect(hints.find((h) => h.context === "read")).toBeUndefined();
  });

  it("flags not_started again once the mid-session window passes", () => {
    const staleSessionRead = [
      makeCandidate({ readCount: 1, lastReadAt: hoursAgo(3) }),
      makeCandidate(), // never read
    ];

    const hints = reducePipelineHints(staleSessionRead, [], now);

    expect(hints.find((h) => h.context === "read")?.message).toBe(
      "There are terms you haven't read yet",
    );
  });

  it("does not gate pace on recent activity — pace relies on the live rolling window instead", () => {
    // Struggling review streak touched a minute ago — still flagged, since
    // pace's own overSafeLine/staleCapCount/strugglingCount already reflect
    // live activity and aren't given a separate mid-session pass.
    const struggling = makeCandidate({
      reviewRecallCount: 3,
      lastReviewRecallAt: minutesAgo(1),
      reviewStreak: -2,
    });

    const hints = reducePipelineHints([], [struggling], now);

    expect(hints.find((h) => h.context === "review")?.message).toBe(
      "Your review pace has slipped",
    );
  });
});
