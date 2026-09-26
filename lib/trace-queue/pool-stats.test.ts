import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import type { TraceCandidate } from "./types";

vi.mock("./repository", () => ({
  fetchTraceCandidates: vi.fn(),
  fetchTraceCandidatesForUser: vi.fn(),
}));

const { fetchTraceCandidatesForUser } = await import("./repository");
const { getReadEligibleCountsByDomainForUser } = await import("./pool-stats");

function candidate(termId: string, domainId: string, markedKnown = false): TraceCandidate {
  return {
    termId,
    domainId,
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
    markedKnownAt: markedKnown ? new Date("2026-01-02T00:00:00Z") : null,
  };
}

describe("getReadEligibleCountsByDomainForUser", () => {
  it("counts each collection's terms, leaving out marked-known ones", async () => {
    vi.mocked(fetchTraceCandidatesForUser).mockResolvedValue([
      candidate("a", "d1"),
      candidate("b", "d1"),
      candidate("c", "d1", true),
      candidate("d", "d2", true),
      candidate("e", "d3"),
    ]);

    const counts = await getReadEligibleCountsByDomainForUser({} as SupabaseClient<Database>, "u1");
    expect(Object.fromEntries(counts)).toEqual({ d1: 2, d3: 1 });
  });
});
