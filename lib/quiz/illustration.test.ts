import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  buildIllustrationQuestions,
  ILLUSTRATION_QUESTION_LINE,
  NONE_OF_THESE_OPTION_ID,
  NONE_OF_THESE_OPTION_TEXT,
} from "./illustration";

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
const threeDistractorsClient = makeClient([
  { id: "x", term: "Distractor X" },
  { id: "y", term: "Distractor Y" },
  { id: "z", term: "Distractor Z" },
]);

describe("buildIllustrationQuestions", () => {
  it("only assigns terms that have an example or anti_example", async () => {
    const terms = [
      { id: "a", term: "Alpha", domainId: "d1", example: "Alpha in action.", antiExample: null },
      {
        id: "b",
        term: "Beta",
        domainId: "d1",
        example: null,
        antiExample: "Looks like Beta but isn't.",
      },
      { id: "c", term: "Gamma", domainId: "d1", example: null, antiExample: null },
      { id: "d", term: "Delta", domainId: "d1", example: "   ", antiExample: "  " },
    ];

    const assignments = await buildIllustrationQuestions(terms, threeDistractorsClient);

    expect(new Set(assignments.keys())).toEqual(new Set(["a", "b"]));
  });

  it("has no cap — every eligible term gets a pick, however many that is", async () => {
    const terms = Array.from({ length: 10 }, (_, i) => ({
      id: `t${i}`,
      term: `Term${i}`,
      domainId: "d1",
      example: `Term${i} in action.`,
      antiExample: null,
    }));

    const assignments = await buildIllustrationQuestions(terms, threeDistractorsClient);
    expect(assignments.size).toBe(10);
  });

  it("builds an example-branch question with the term itself as the correct option", async () => {
    const terms = [
      {
        id: "only-example",
        term: "OnlyExample",
        domainId: "d1",
        example: "A real example.",
        antiExample: null,
      },
    ];

    const assignments = await buildIllustrationQuestions(terms, threeDistractorsClient);
    const pick = assignments.get("only-example");

    expect(pick?.scenarioText).toBe("A real example.");
    expect(pick?.correctOptionId).toBe("only-example");
    expect(pick?.options).toHaveLength(4);
    expect(pick?.options.map((o) => o.id)).toContain("only-example");
    expect(pick?.options.some((o) => o.id === NONE_OF_THESE_OPTION_ID)).toBe(false);
  });

  it("builds an anti-example-branch question with 'None of these' as the correct, pinned-last option", async () => {
    const terms = [
      {
        id: "only-anti",
        term: "OnlyAnti",
        domainId: "d1",
        example: null,
        antiExample: "A tempting but wrong example.",
      },
    ];

    const assignments = await buildIllustrationQuestions(terms, threeDistractorsClient);
    const pick = assignments.get("only-anti");

    expect(pick?.scenarioText).toBe("A tempting but wrong example.");
    expect(pick?.correctOptionId).toBe(NONE_OF_THESE_OPTION_ID);
    expect(pick?.options).toHaveLength(4);
    // "None of these" is always last, not shuffled in.
    expect(pick?.options.at(-1)).toEqual({
      id: NONE_OF_THESE_OPTION_ID,
      text: NONE_OF_THESE_OPTION_TEXT,
    });
    // The term's own name is deliberately included as a trap wrong option.
    expect(pick?.options.some((o) => o.id === "only-anti")).toBe(true);
  });

  it("picks randomly between example and anti_example when both are present", async () => {
    const terms = [
      {
        id: "both",
        term: "Both",
        domainId: "d1",
        example: "A real example.",
        antiExample: "A tempting but wrong example.",
      },
    ];

    const seenCorrectIds = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const assignments = await buildIllustrationQuestions(terms, threeDistractorsClient);
      const pick = assignments.get("both");
      if (pick) seenCorrectIds.add(pick.correctOptionId);
    }

    expect(seenCorrectIds.has("both")).toBe(true);
    expect(seenCorrectIds.has(NONE_OF_THESE_OPTION_ID)).toBe(true);
  });

  it("shows fewer options when the domain has fewer distractors, instead of skipping the question", async () => {
    const terms = [
      {
        id: "only-example",
        term: "OnlyExample",
        domainId: "d1",
        example: "A real example.",
        antiExample: null,
      },
    ];

    const assignments = await buildIllustrationQuestions(terms, noDistractorsClient);
    const pick = assignments.get("only-example");

    expect(pick).toBeDefined();
    expect(pick?.options).toEqual([{ id: "only-example", text: "OnlyExample" }]);
  });

  it("shows fewer options for a scarce anti-example question but still pins 'None of these' last", async () => {
    const terms = [
      {
        id: "only-anti",
        term: "OnlyAnti",
        domainId: "d1",
        example: null,
        antiExample: "A tempting but wrong example.",
      },
    ];

    const assignments = await buildIllustrationQuestions(terms, noDistractorsClient);
    const pick = assignments.get("only-anti");

    expect(pick?.options).toEqual([
      { id: "only-anti", text: "OnlyAnti" },
      { id: NONE_OF_THESE_OPTION_ID, text: NONE_OF_THESE_OPTION_TEXT },
    ]);
  });
});

describe("ILLUSTRATION_QUESTION_LINE", () => {
  it("is a generic line that doesn't name the term", () => {
    expect(ILLUSTRATION_QUESTION_LINE).toBe("What does this illustrate?");
  });
});
