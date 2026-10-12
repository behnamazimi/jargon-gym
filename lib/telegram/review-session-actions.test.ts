import { beforeEach, describe, expect, it, vi } from "vitest";
import { AGAIN, EASY, GOOD, LEARNING_STEP_MAX_RETRIES } from "@/lib/trace";

const { saveStoredReviewSession } = vi.hoisted(() => ({
  saveStoredReviewSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./review-session-store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./review-session-store")>()),
  saveStoredReviewSession,
}));
vi.mock("@/lib/trace-queue", () => ({ fetchTermCardForUser: vi.fn() }));

import { RETRY_AFTER_CARDS_TELEGRAM, recordReviewRating } from "./review-session-actions";
import { countOriginalReviewTerms, type TelegramReviewSession } from "./review-session-store";

const client = {} as never;

function session(count: number, patch: Partial<TelegramReviewSession> = {}): TelegramReviewSession {
  return {
    userId: "u1",
    collectionId: "all",
    terms: Array.from({ length: count }, (_, i) => ({
      id: `t${i}`,
      status: "unknown" as const,
      isNewToUser: i === 0,
    })),
    currentIndex: 0,
    revealed: true,
    retainedCount: 0,
    startedAt: 0,
    ...patch,
  };
}

const ids = (s: TelegramReviewSession) =>
  s.terms.map((t) => `${t.id}${t.retry ? `#${t.retry}` : ""}`);

beforeEach(() => saveStoredReviewSession.mockClear());

describe("recordReviewRating retries", () => {
  it("asks a missed term again a few cards later, no longer new", async () => {
    const next = await recordReviewRating(client, 1, session(8), AGAIN);
    expect(next.currentIndex).toBe(1);
    expect(ids(next)[1 + RETRY_AFTER_CARDS_TELEGRAM]).toBe("t0#1");
    expect(next.terms.find((t) => t.retry)?.isNewToUser).toBe(false);
    expect(next.retainedCount).toBe(0);
  });

  it("puts it at the end when fewer cards are left", async () => {
    const next = await recordReviewRating(client, 1, session(2), AGAIN);
    expect(ids(next)).toEqual(["t0", "t1", "t0#1"]);
  });

  it("does not ask a recalled term again", async () => {
    const next = await recordReviewRating(client, 1, session(4), GOOD);
    expect(next.terms).toHaveLength(4);
    expect(next.retainedCount).toBe(1);
  });

  it("stops after the maximum number of retries", async () => {
    const base = session(1);
    const last = { ...base, terms: [{ ...base.terms[0]!, retry: LEARNING_STEP_MAX_RETRIES }] };
    const next = await recordReviewRating(client, 1, last, AGAIN);
    expect(next.terms).toHaveLength(1);
  });

  it("a retry that is recalled doesn't count as another retained card", async () => {
    const base = session(2);
    const onRetry = { ...base, terms: [{ ...base.terms[0]!, retry: 1 }, base.terms[1]!] };
    const next = await recordReviewRating(client, 1, onRetry, EASY);
    expect(next.retainedCount).toBe(0);
  });

  it("saves the longer card list", async () => {
    await recordReviewRating(client, 1, session(3), AGAIN);
    expect(saveStoredReviewSession.mock.calls[0]![2].terms).toHaveLength(4);
  });
});

describe("countOriginalReviewTerms", () => {
  it("leaves out cards that are asked again", async () => {
    const next = await recordReviewRating(client, 1, session(3), AGAIN);
    expect(countOriginalReviewTerms(next.terms)).toBe(3);
  });
});
