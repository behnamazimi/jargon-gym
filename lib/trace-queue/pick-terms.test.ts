import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/terms/term-card";
import type { TraceCandidate } from "./types";

const mocks = vi.hoisted(() => ({
  candidates: [] as TraceCandidate[],
  hydrate: vi.fn(),
}));

vi.mock("./repository", () => ({
  fetchTraceCandidates: async () => mocks.candidates,
  fetchTraceCandidatesForUser: async () => mocks.candidates,
}));
vi.mock("./hydrate", () => ({
  hydrateTermsAsTermCards: mocks.hydrate,
  hydrateTermCardsForUser: mocks.hydrate,
}));

const { pickQuizTerms, pickQuizTermsForUser } = await import("./pick-terms");

const client = {} as SupabaseClient<Database>;

function candidate(termId: string, overrides: Partial<TraceCandidate> = {}): TraceCandidate {
  return {
    termId,
    collectionId: "d",
    createdAt: new Date("2026-01-01"),
    everMasteredAt: null,
    everLearningAt: null,
    markedKnownAt: null,
    readCount: 0,
    lastReadAt: null,
    recallStability: null,
    recallDifficulty: null,
    reviewRecallCount: 0,
    lastReviewRecallAt: null,
    quizKnowledgePosterior: null,
    quizTestCount: 0,
    lastQuizTestedAt: null,
    ...overrides,
  };
}

const card = (id: string) => ({ id }) as TermCard;

describe("quiz pickers carry recognition", () => {
  beforeEach(() => {
    mocks.hydrate.mockImplementation(async (...args: unknown[]) =>
      (args.at(-1) as string[]).map(card),
    );
  });

  it("copies each picked term's posterior and test count onto its card", async () => {
    mocks.candidates = [
      candidate("known", {
        quizKnowledgePosterior: 0.82,
        quizTestCount: 3,
        lastQuizTestedAt: new Date("2026-01-02"),
      }),
      candidate("new"),
    ];

    const cards = await pickQuizTerms(client, "u", { collectionIds: "all" } as never, 10);
    const byId = Object.fromEntries(cards.map((c) => [c.id, c.recognition]));
    expect(byId.known).toEqual({ posterior: 0.82, testCount: 3 });
    expect(byId.new).toEqual({ posterior: null, testCount: 0 });
  });

  it("does the same on the service-role path used by Telegram", async () => {
    mocks.candidates = [
      candidate("a", {
        quizKnowledgePosterior: 0.5,
        quizTestCount: 1,
        lastQuizTestedAt: new Date("2026-01-02"),
      }),
    ];
    const [first] = await pickQuizTermsForUser(client, "u", { collectionIds: "all" } as never, 10);
    expect(first.recognition).toEqual({ posterior: 0.5, testCount: 1 });
  });
});
