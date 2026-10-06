import { describe, expect, it } from "vitest";
import { buildQueueDebug, excludedReasons, type QueueDebugTerm } from "./build";

const NOW = new Date("2026-10-06T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function term(id: string, overrides: Partial<QueueDebugTerm> = {}): QueueDebugTerm {
  return {
    termId: id,
    domainId: "d1",
    createdAt: new Date("2026-09-01T00:00:00Z"),
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
    term: id,
    domainName: "Standup",
    active: true,
    finished: true,
    ...overrides,
  };
}

const options = {
  now: NOW,
  domainId: null,
  limit: 50,
  batch: { read: 2, review: 2, quiz: 2 },
};

describe("buildQueueDebug", () => {
  it("ranks never-graded terms ahead of graded ones and marks the next batch", () => {
    const graded = term("graded", {
      recallStability: 2,
      lastReviewRecallAt: new Date(NOW.getTime() - 10 * DAY),
    });
    const debug = buildQueueDebug([graded, term("a"), term("b")], options);

    expect(debug.review.rows.map((r) => r.item.termId)).toEqual(["a", "b", "graded"]);
    expect(debug.review.rows.map((r) => r.nextBatch)).toEqual([true, true, false]);
    expect(debug.review.rows[0]!.retrievability).toBeNull();
  });

  it("holds a just-graded term out of Review and says when it comes back", () => {
    const lastAt = new Date(NOW.getTime() - 60 * 1000);
    const fresh = term("fresh", {
      recallStability: 3,
      recallDifficulty: 5,
      lastReviewRecallAt: lastAt,
    });
    const debug = buildQueueDebug([fresh], options);

    expect(debug.review.rows).toEqual([]);
    const [row] = debug.reviewCooldown.rows;
    expect(row!.retrievability).toBeGreaterThan(0.98);
    expect(row!.difficulty).toBe(5);

    // 9 · S · (1/0.98 − 1) days after the grade
    const days = (9 * 3 * 0.02) / 0.98;
    expect(row!.returnsAt!.getTime() - lastAt.getTime()).toBeCloseTo(days * DAY, -2);
  });

  it("keeps a term in the queue exactly when the cooldown ends", () => {
    const stability = 4;
    const lastAt = new Date(NOW.getTime() - 60 * 1000);
    const held = term("held", { recallStability: stability, lastReviewRecallAt: lastAt });
    const [row] = buildQueueDebug([held], options).reviewCooldown.rows;

    const later = buildQueueDebug([held], {
      ...options,
      now: new Date(row!.returnsAt!.getTime() + 1000),
    });
    expect(later.review.rows.map((r) => r.item.termId)).toEqual(["held"]);
    expect(later.reviewCooldown.rows).toEqual([]);
  });

  it("lists Quiz cooldowns with the posterior", () => {
    const answered = term("answered", {
      quizKnowledgePosterior: 0.9,
      lastQuizTestedAt: new Date(NOW.getTime() - 60 * 1000),
    });
    const debug = buildQueueDebug([answered], options);

    expect(debug.quiz.rows).toEqual([]);
    expect(debug.quizCooldown.rows[0]!.posterior).toBe(0.9);
    expect(debug.quizCooldown.rows[0]!.returnsAt).not.toBeNull();
  });

  it("sorts cooldowns by the soonest return", () => {
    const lastAt = new Date(NOW.getTime() - 60 * 1000);
    const slow = term("slow", { recallStability: 30, lastReviewRecallAt: lastAt });
    const quick = term("quick", { recallStability: 1, lastReviewRecallAt: lastAt });
    const debug = buildQueueDebug([slow, quick], options);

    expect(debug.reviewCooldown.rows.map((r) => r.item.termId)).toEqual(["quick", "slow"]);
  });

  it("leaves marked-known, unfinished and paused-collection terms out and says why", () => {
    const debug = buildQueueDebug(
      [
        term("ok"),
        term("known", { markedKnownAt: NOW }),
        term("draft", { finished: false }),
        term("off", { active: false }),
        term("both", { active: false, markedKnownAt: NOW }),
      ],
      options,
    );

    expect(debug.eligible).toBe(1);
    expect(debug.read.rows.map((r) => r.item.termId)).toEqual(["ok"]);
    expect(debug.excluded.rows.map((r) => [r.item.termId, r.reasons])).toEqual([
      ["both", ["collection_off", "marked_known"]],
      ["draft", ["unfinished"]],
      ["known", ["marked_known"]],
      ["off", ["collection_off"]],
    ]);
  });

  it("filters to one collection", () => {
    const debug = buildQueueDebug([term("a"), term("b", { domainId: "d2" })], {
      ...options,
      domainId: "d2",
    });
    expect(debug.read.rows.map((r) => r.item.termId)).toEqual(["b"]);
  });

  it("caps each section but reports the full count", () => {
    const terms = ["a", "b", "c"].map((id) => term(id));
    const debug = buildQueueDebug(terms, { ...options, limit: 2 });
    expect(debug.read.rows).toHaveLength(2);
    expect(debug.read.total).toBe(3);
  });

  it("ties on score break by oldest term, like Read", () => {
    const older = term("older", { createdAt: new Date("2026-08-01T00:00:00Z") });
    const debug = buildQueueDebug([term("newer"), older], options);
    expect(debug.read.rows.map((r) => r.item.termId)).toEqual(["older", "newer"]);
  });
});

describe("excludedReasons", () => {
  it("is empty for a servable term", () => {
    expect(excludedReasons(term("ok"))).toEqual([]);
  });
});
