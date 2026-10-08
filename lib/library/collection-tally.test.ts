import { describe, expect, it } from "vitest";
import { fetchCollectionStats } from "./collection-tally";

type Row = { collection_id: string; term_id: string; marked_known_at: string | null };

function progressRow(collectionId: string, n: number): Row & Record<string, unknown> {
  return {
    collection_id: collectionId,
    term_id: `t${n}`,
    read_count: 0,
    last_read_at: null,
    recall_stability: null,
    recall_difficulty: null,
    review_recall_count: 0,
    last_review_recall_at: null,
    quiz_knowledge_posterior: null,
    quiz_test_count: 0,
    last_quiz_tested_at: null,
    ever_mastered_at: null,
    marked_known_at: n % 2 === 0 ? "2026-09-01T00:00:00Z" : null,
  };
}

/** A client whose progress RPC caps each response at 1000 rows, like PostgREST. */
function fakeClient(rows: Row[]) {
  return {
    rpc(name: string) {
      if (name === "my_unfinished_term_counts") return Promise.resolve({ data: [], error: null });
      return {
        order: () => ({
          range: (from: number, to: number) =>
            Promise.resolve({ data: rows.slice(from, Math.min(to + 1, from + 1000)), error: null }),
        }),
      };
    },
  };
}

describe("fetchCollectionStats", () => {
  it("counts every term past the 1000-row page limit", async () => {
    const rows = [
      ...Array.from({ length: 1500 }, (_, i) => progressRow("big", i)),
      ...Array.from({ length: 700 }, (_, i) => progressRow("small", 1500 + i)),
    ];
    const stats = await fetchCollectionStats(fakeClient(rows) as never, ["big", "small"]);
    expect(stats.get("big")).toMatchObject({ termCount: 1500, markedKnownCount: 750 });
    expect(stats.get("small")).toMatchObject({ termCount: 700, markedKnownCount: 350 });
  });
});
