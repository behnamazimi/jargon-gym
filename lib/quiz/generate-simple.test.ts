import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { generateSimpleQuiz } from "./generate-simple";
import type { QuizTerm } from "./types";

type Client = SupabaseClient<Database>;

function makeClient(domainTerms: { id: string; term: string }[]): Client {
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
              limit: () => Promise.resolve({ data: domainTerms, error: null }),
            }),
          }),
        }),
      };
    },
  } as unknown as Client;
}

function makeTerm(overrides: Partial<QuizTerm>): QuizTerm {
  return {
    id: "term-default",
    term: "Default Term",
    definition: "A default definition.",
    example: null,
    antiExample: null,
    domainId: "domain-1",
    domainName: "Testing",
    ...overrides,
  };
}

describe("generateSimpleQuiz", () => {
  it("only builds example-judgment questions for eligible terms, one per term", async () => {
    const terms: QuizTerm[] = [
      makeTerm({ id: "a", term: "Alpha", example: "Alpha in action." }),
      makeTerm({ id: "b", term: "Beta", antiExample: "This looks like Beta but isn't." }),
      makeTerm({
        id: "c",
        term: "Gamma",
        example: "Gamma in action.",
        antiExample: "This looks like Gamma but isn't.",
      }),
      makeTerm({ id: "d", term: "Delta" }),
      makeTerm({ id: "e", term: "Epsilon" }),
      makeTerm({ id: "f", term: "Zeta" }),
    ];
    const client = makeClient([
      { id: "x", term: "Distractor X" },
      { id: "y", term: "Distractor Y" },
      { id: "z", term: "Distractor Z" },
    ]);

    const questions = await generateSimpleQuiz(terms, client);

    expect(questions).toHaveLength(terms.length);
    // Each term produces exactly one question.
    expect(new Set(questions.map((q) => q.termId)).size).toBe(terms.length);

    const exampleJudgment = questions.filter(
      (q) =>
        q.type === "true_false" &&
        (q.prompt.includes("Alpha in action.") ||
          q.prompt.includes("This looks like Beta but isn't.") ||
          q.prompt.includes("Gamma in action.") ||
          q.prompt.includes("This looks like Gamma but isn't.")),
    );

    // Only terms a, b, c are eligible (have example or anti_example).
    for (const q of exampleJudgment) {
      expect(["a", "b", "c"]).toContain(q.termId);
    }

    // Terms with no example/anti_example never produce an example-judgment question.
    const ineligibleQuestions = questions.filter((q) => ["d", "e", "f"].includes(q.termId));
    for (const q of ineligibleQuestions) {
      expect(q.prompt.includes("in action") || q.prompt.includes("isn't")).toBe(false);
    }
  });

  it("sets correctAnswer=true when sourced from example, false when sourced from anti_example", async () => {
    // Total of 5 terms (2 eligible, 3 not) so the 40% example-judgment cap
    // (floor(5 * 0.4) = 2) has room to select both eligible terms.
    const terms: QuizTerm[] = [
      makeTerm({ id: "only-example", term: "OnlyExample", example: "A real example." }),
      makeTerm({
        id: "only-anti",
        term: "OnlyAnti",
        antiExample: "A tempting but wrong example.",
      }),
      makeTerm({ id: "plain-1", term: "Plain1" }),
      makeTerm({ id: "plain-2", term: "Plain2" }),
      makeTerm({ id: "plain-3", term: "Plain3" }),
    ];
    const client = makeClient([
      { id: "x", term: "Distractor X" },
      { id: "y", term: "Distractor Y" },
      { id: "z", term: "Distractor Z" },
    ]);

    const questions = await generateSimpleQuiz(terms, client);

    const exampleQ = questions.find((q) => q.termId === "only-example");
    const antiQ = questions.find((q) => q.termId === "only-anti");

    expect(exampleQ?.type).toBe("true_false");
    expect(antiQ?.type).toBe("true_false");
    if (exampleQ?.type === "true_false") {
      expect(exampleQ.correctAnswer).toBe(true);
      expect(exampleQ.prompt).toBe('Does this illustrate "OnlyExample"?\nA real example.');
    }
    if (antiQ?.type === "true_false") {
      expect(antiQ.correctAnswer).toBe(false);
      expect(antiQ.prompt).toBe('Does this illustrate "OnlyAnti"?\nA tempting but wrong example.');
    }
  });

  it("keeps example-judgment and plain true_false combined at or under 40% of the quiz", async () => {
    // Regression guard: illustration questions alone used to be able to hit
    // 50% of the quiz, and plain true/false could add more on top. All 10
    // terms here are eligible for example-judgment, so this exercises the
    // worst case for the combined cap.
    const terms: QuizTerm[] = Array.from({ length: 10 }, (_, i) =>
      makeTerm({ id: `t${i}`, term: `Term${i}`, example: `Term${i} in action.` }),
    );
    const client = makeClient([
      { id: "x", term: "Distractor X" },
      { id: "y", term: "Distractor Y" },
      { id: "z", term: "Distractor Z" },
    ]);

    const questions = await generateSimpleQuiz(terms, client);
    const trueFalseCount = questions.filter((q) => q.type === "true_false").length;

    expect(trueFalseCount).toBeLessThanOrEqual(4);
  });

  it("falls back to multiple_choice for terms with neither field", async () => {
    const terms: QuizTerm[] = [makeTerm({ id: "plain", term: "Plain" })];
    const client = makeClient([
      { id: "x", term: "Distractor X" },
      { id: "y", term: "Distractor Y" },
      { id: "z", term: "Distractor Z" },
    ]);

    const questions = await generateSimpleQuiz(terms, client);

    expect(questions).toHaveLength(1);
    expect(["multiple_choice", "true_false"]).toContain(questions[0].type);
  });
});
