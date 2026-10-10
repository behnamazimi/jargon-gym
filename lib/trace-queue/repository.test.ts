import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchTraceCandidatesForUser } from "./repository";

function clientReturning(rows: unknown) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: rows, error: null }),
  } as unknown as SupabaseClient<never>;
}

const row = {
  term_id: "t1",
  collection_id: "c1",
  created_at: "2026-09-01T00:00:00Z",
  read_count: 0,
  last_read_at: null,
  recall_stability: 1.5,
  recall_difficulty: 6,
  review_recall_count: 1,
  last_review_recall_at: "2026-10-01T00:00:00Z",
  quiz_knowledge_posterior: null,
  quiz_test_count: 0,
  last_quiz_tested_at: null,
  ever_mastered_at: null,
  ever_learning_at: null,
  marked_known_at: null,
};

describe("fetchTraceCandidatesForUser", () => {
  it("maps the last Review grade", async () => {
    const [candidate] = await fetchTraceCandidatesForUser(
      clientReturning([{ ...row, last_review_grade: 1 }]),
      "u1",
      { collectionIds: "all" },
    );
    expect(candidate!.lastReviewGrade).toBe(1);
  });

  it("reads a missing, null or out-of-range grade as none", async () => {
    const candidates = await fetchTraceCandidatesForUser(
      clientReturning([
        { ...row, term_id: "a" },
        { ...row, term_id: "b", last_review_grade: null },
        { ...row, term_id: "c", last_review_grade: 9 },
      ]),
      "u1",
      { collectionIds: "all" },
    );
    expect(candidates.map((c) => c.lastReviewGrade)).toEqual([null, null, null]);
  });
});
