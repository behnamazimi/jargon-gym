import { describe, expect, it } from "vitest";
import { mapQueueDebugRows } from "./load";

describe("mapQueueDebugRows", () => {
  it("maps a row and its dates", () => {
    const [row] = mapQueueDebugRows([
      {
        term_id: "t1",
        term: "standup",
        collection_id: "d1",
        collection_name: "Work",
        active: false,
        finished: true,
        created_at: "2026-09-01T00:00:00Z",
        read_count: 2,
        last_read_at: "2026-10-01T00:00:00Z",
        recall_stability: 3.5,
        recall_difficulty: 6,
        review_recall_count: 1,
        last_review_recall_at: null,
        quiz_knowledge_posterior: null,
        quiz_test_count: 0,
        last_quiz_tested_at: null,
        ever_mastered_at: null,
        ever_learning_at: null,
        marked_known_at: "2026-10-02T00:00:00Z",
        last_review_grade: 2,
      },
    ]);

    expect(row).toMatchObject({
      termId: "t1",
      term: "standup",
      collectionName: "Work",
      active: false,
      recallStability: 3.5,
      lastReviewRecallAt: null,
      lastReviewGrade: 2,
    });
    expect(row!.lastReadAt).toEqual(new Date("2026-10-01T00:00:00Z"));
    expect(row!.markedKnownAt).toEqual(new Date("2026-10-02T00:00:00Z"));
  });

  it("reads a missing or out-of-range grade as none", () => {
    const base = {
      term_id: "t1",
      term: "standup",
      collection_id: "d1",
      collection_name: "Work",
      active: true,
      finished: true,
      created_at: "2026-09-01T00:00:00Z",
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
      ever_learning_at: null,
      marked_known_at: null,
    };
    const rows = mapQueueDebugRows([base, { ...base, last_review_grade: 9 }]);
    expect(rows.map((r) => r.lastReviewGrade)).toEqual([null, null]);
  });

  it("refuses anything but an array", () => {
    expect(() => mapQueueDebugRows({})).toThrow();
  });
});
