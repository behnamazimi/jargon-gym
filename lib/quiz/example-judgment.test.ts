import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  assignExampleJudgmentQuestions,
  buildExampleJudgmentQuestionLine,
} from "./example-judgment";

type Client = SupabaseClient<Database>;

function makeClient(domainTerms: { id: string; term: string; example?: string | null }[]): Client {
  const rows = domainTerms.map((t) => ({ ...t, example: t.example ?? null }));
  return {
    from(table: string) {
      if (table === "term_relationships") {
        return {
          select: () => ({
            or: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            not: () => ({
              limit: () => Promise.resolve({ data: rows, error: null }),
            }),
          }),
        }),
      };
    },
  } as unknown as Client;
}

const noDistractorsClient = makeClient([]);

describe("assignExampleJudgmentQuestions", () => {
  it("only assigns terms that have an example or anti_example", async () => {
    const terms = [
      { id: "a", domainId: "d1", example: "Alpha in action.", antiExample: null },
      { id: "b", domainId: "d1", example: null, antiExample: "Looks like Beta but isn't." },
      { id: "c", domainId: "d1", example: null, antiExample: null },
      { id: "d", domainId: "d1", example: null, antiExample: null },
    ];

    const assignments = await assignExampleJudgmentQuestions(terms, noDistractorsClient);

    for (const id of assignments.keys()) {
      expect(["a", "b"]).toContain(id);
    }
  });

  it("sets correctAnswer true from example, false from anti_example when no borrowing is needed", async () => {
    // 5 terms total (default cap = floor(5 * 0.4) = 2) so the default cap
    // has room for both eligible ones.
    const terms = [
      { id: "only-example", domainId: "d1", example: "A real example.", antiExample: null },
      {
        id: "only-anti",
        domainId: "d1",
        example: null,
        antiExample: "A tempting but wrong example.",
      },
      { id: "plain-1", domainId: "d1", example: null, antiExample: null },
      { id: "plain-2", domainId: "d1", example: null, antiExample: null },
      { id: "plain-3", domainId: "d1", example: null, antiExample: null },
    ];

    // No distractors have an example to borrow, so each term keeps its one
    // authored candidate.
    const assignments = await assignExampleJudgmentQuestions(terms, noDistractorsClient);

    expect(assignments.get("only-example")).toEqual({
      text: "A real example.",
      correctAnswer: true,
    });
    expect(assignments.get("only-anti")).toEqual({
      text: "A tempting but wrong example.",
      correctAnswer: false,
    });
  });

  it("borrows a distractor's example to give a one-sided term a real chance at the other answer", async () => {
    const terms = [
      { id: "only-example", domainId: "d1", example: "A real example.", antiExample: null },
    ];
    const client = makeClient([
      { id: "x", term: "Distractor X", example: "Distractor's example." },
    ]);

    const seenAnswers = new Set<boolean>();
    for (let i = 0; i < 50; i++) {
      const assignments = await assignExampleJudgmentQuestions(terms, client, 1);
      const pick = assignments.get("only-example");
      if (pick) seenAnswers.add(pick.correctAnswer);
    }

    // With a real borrowed example available, the term should no longer be
    // forced to always answer the same way.
    expect(seenAnswers.has(true)).toBe(true);
    expect(seenAnswers.has(false)).toBe(true);
  });

  it("falls back to the single authored candidate when no distractor has an example", async () => {
    const terms = [
      { id: "only-example", domainId: "d1", example: "A real example.", antiExample: null },
    ];
    const client = makeClient([{ id: "x", term: "Distractor X", example: null }]);

    const assignments = await assignExampleJudgmentQuestions(terms, client, 1);

    expect(assignments.get("only-example")).toEqual({
      text: "A real example.",
      correctAnswer: true,
    });
  });

  it("drops a term with no candidates and no distractors instead of forcing an answer", async () => {
    const terms = [{ id: "empty", domainId: "d1", example: "  ", antiExample: null }];

    const assignments = await assignExampleJudgmentQuestions(terms, noDistractorsClient, 1);

    // Whitespace-only example counts as missing, and eligibility already
    // filters these out — so nothing should be assigned.
    expect(assignments.has("empty")).toBe(false);
  });

  it("defaults the cap to 40% of the input", async () => {
    const terms = Array.from({ length: 10 }, (_, i) => ({
      id: `t${i}`,
      domainId: "d1",
      example: `Example ${i}`,
      antiExample: null,
    }));

    const assignments = await assignExampleJudgmentQuestions(terms, noDistractorsClient);
    expect(assignments.size).toBeLessThanOrEqual(4);
  });

  it("honors an explicit maxCount override", async () => {
    const terms = Array.from({ length: 10 }, (_, i) => ({
      id: `t${i}`,
      domainId: "d1",
      example: `Example ${i}`,
      antiExample: null,
    }));

    const assignments = await assignExampleJudgmentQuestions(terms, noDistractorsClient, 1);
    expect(assignments.size).toBe(1);
  });
});

describe("buildExampleJudgmentQuestionLine", () => {
  it("wraps the term name in a question", () => {
    expect(buildExampleJudgmentQuestionLine("Sharding")).toBe('Does this illustrate "Sharding"?');
  });
});
