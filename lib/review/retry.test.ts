import { describe, expect, it } from "vitest";
import { AGAIN, EASY, GOOD, LEARNING_STEP_MAX_RETRIES, daysUntilNextReview } from "@/lib/trace";
import { RETRY_AFTER_CARDS, cardKey, insertRetry, makeRetryCard, shouldRetry } from "./retry";
import type { ReviewTerm } from "./types";

function card(id: string, patch: Partial<ReviewTerm> = {}): ReviewTerm {
  return { id, ...patch } as ReviewTerm;
}

describe("cardKey", () => {
  it("tells showings of the same term apart", () => {
    expect(cardKey(card("a"))).toBe("a:0");
    expect(cardKey(card("a", { visit: 2 }))).toBe("a:2");
  });
});

describe("shouldRetry", () => {
  it("only an Again retries, and only while retries are left", () => {
    expect(shouldRetry(card("a"), AGAIN)).toBe(true);
    expect(shouldRetry(card("a"), GOOD)).toBe(false);
    expect(shouldRetry(card("a", { visit: LEARNING_STEP_MAX_RETRIES - 1 }), AGAIN)).toBe(true);
    expect(shouldRetry(card("a", { visit: LEARNING_STEP_MAX_RETRIES }), AGAIN)).toBe(false);
  });
});

describe("makeRetryCard", () => {
  const now = new Date("2026-03-01T09:00:00Z");

  it("is the next showing of the same term, no longer new", () => {
    const retry = makeRetryCard(card("a", { isNewToUser: true }), AGAIN, now);
    expect(retry.id).toBe("a");
    expect(retry.visit).toBe(1);
    expect(retry.isNewToUser).toBe(false);
  });

  it("carries the recall state the Again leaves, so a Good on it shows at least a day", () => {
    const retry = makeRetryCard(card("a"), AGAIN, now);
    expect(retry.recall?.stability).toBeGreaterThan(0);
    expect(retry.recall?.lastReviewAt).toBe(now.toISOString());
    const later = new Date(now.getTime() + 10 * 60_000);
    const days = daysUntilNextReview(
      {
        readCount: retry.recall!.readCount,
        lastReadAt: null,
        recallStability: retry.recall!.stability,
        recallDifficulty: retry.recall!.difficulty,
        lastReviewRecallAt: new Date(retry.recall!.lastReviewAt!),
      },
      later,
    );
    expect(days[GOOD]).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(days[EASY]).toBeGreaterThanOrEqual(days[GOOD]);
    expect(days[AGAIN]).toBeLessThan(1);
  });
});

describe("insertRetry", () => {
  const ids = (terms: ReviewTerm[]) => terms.map((t) => `${t.id}:${t.visit ?? 0}`);
  const queue = Array.from({ length: 10 }, (_, i) => card(String(i)));

  it("puts the retry after a few other cards", () => {
    const next = insertRetry(queue, 0, card("0", { visit: 1 }));
    expect(next).toHaveLength(11);
    expect(ids(next)[1 + RETRY_AFTER_CARDS]).toBe("0:1");
  });

  it("goes to the end when fewer cards are left", () => {
    const next = insertRetry(queue, 8, card("8", { visit: 1 }));
    expect(ids(next).at(-1)).toBe("8:1");
  });

  it("does not change the cards before it", () => {
    const next = insertRetry(queue, 2, card("2", { visit: 1 }));
    expect(ids(next).slice(0, 3)).toEqual(["0:0", "1:0", "2:0"]);
  });
});
