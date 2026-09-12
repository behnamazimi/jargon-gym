import { describe, expect, it } from "vitest";
import { foldProgressStateRows, type ProgressStateRow } from "./progress-state";

function makeRow(
  overrides: Partial<ProgressStateRow> & Pick<ProgressStateRow, "term_id" | "domain_id">,
): ProgressStateRow {
  return {
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
    marked_known_at: null,
    ...overrides,
  };
}

describe("foldProgressStateRows", () => {
  it("only includes rows from the requested domain(s)", () => {
    const rows = [
      makeRow({ term_id: "t1", domain_id: "domain-a", marked_known_at: "2026-01-01T00:00:00Z" }),
      makeRow({ term_id: "t2", domain_id: "domain-b", marked_known_at: "2026-01-01T00:00:00Z" }),
    ];

    expect(foldProgressStateRows(["domain-a"], rows).markedKnownTermIds).toEqual(["t1"]);
    expect(foldProgressStateRows(["domain-a", "domain-b"], rows).markedKnownTermIds.sort()).toEqual(
      ["t1", "t2"],
    );
  });

  it("excludes a term with no read/review/quiz history from knownTermIds", () => {
    const rows = [makeRow({ term_id: "t1", domain_id: "domain-a" })];
    expect(foldProgressStateRows(["domain-a"], rows).knownTermIds).toEqual([]);
  });

  it("collects markedKnownTermIds independently of the TRACE known label", () => {
    // marked_known_at is a user override, never folded into knownTermIds itself —
    // this mirrors tallyDomainStats's knownCount (which DOES OR markedKnown in),
    // so the two must stay intentionally different, not accidentally equal.
    const rows = [
      makeRow({ term_id: "t1", domain_id: "domain-a", marked_known_at: "2026-01-01T00:00:00Z" }),
    ];

    const result = foldProgressStateRows(["domain-a"], rows);
    expect(result.markedKnownTermIds).toEqual(["t1"]);
    expect(result.knownTermIds).toEqual([]);
  });

  it("collects everMasteredTermIds from the permanent high-water mark", () => {
    const rows = [
      makeRow({ term_id: "t1", domain_id: "domain-a", ever_mastered_at: "2026-01-01T00:00:00Z" }),
      makeRow({ term_id: "t2", domain_id: "domain-a" }),
    ];

    expect(foldProgressStateRows(["domain-a"], rows).everMasteredTermIds).toEqual(["t1"]);
  });

  it("returns empty lists for an empty row set", () => {
    expect(foldProgressStateRows(["domain-a"], [])).toEqual({
      knownTermIds: [],
      markedKnownTermIds: [],
      everMasteredTermIds: [],
    });
  });
});
