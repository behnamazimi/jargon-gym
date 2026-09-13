import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { generateSimpleQuiz } from "./generate-simple";
import type { QuizTerm } from "./types";

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
  it("builds an illustration multiple_choice question for eligible terms, one per term", async () => {
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

    const illustrationQuestions = questions.filter((q) =>
      q.prompt.startsWith("What does this illustrate?"),
    );

    // Only terms a, b, c are eligible (have example or anti_example).
    for (const q of illustrationQuestions) {
      expect(["a", "b", "c"]).toContain(q.termId);
      expect(q.type).toBe("multiple_choice");
    }
    expect(new Set(illustrationQuestions.map((q) => q.termId))).toEqual(new Set(["a", "b", "c"]));

    // Terms with no example/anti_example fall back to definition MCQ, whose
    // prompt is the term's own definition, not an illustration prompt.
    const ineligibleQuestions = questions.filter((q) => ["d", "e", "f"].includes(q.termId));
    for (const q of ineligibleQuestions) {
      expect(q.prompt.startsWith("What does this illustrate?")).toBe(false);
    }
  });

  it("has no cap — all eligible terms get an illustration question regardless of quiz size", async () => {
    const terms: QuizTerm[] = Array.from({ length: 10 }, (_, i) =>
      makeTerm({ id: `t${i}`, term: `Term${i}`, example: `Term${i} in action.` }),
    );
    const client = makeClient([
      { id: "x", term: "Distractor X" },
      { id: "y", term: "Distractor Y" },
      { id: "z", term: "Distractor Z" },
    ]);

    const questions = await generateSimpleQuiz(terms, client);
    const illustrationCount = questions.filter((q) =>
      q.prompt.startsWith("What does this illustrate?"),
    ).length;

    expect(illustrationCount).toBe(10);
  });

  it("sets correctOptionIds to the term itself when sourced from example, and to 'none' when sourced from anti_example", async () => {
    const terms: QuizTerm[] = [
      makeTerm({ id: "only-example", term: "OnlyExample", example: "A real example." }),
      makeTerm({
        id: "only-anti",
        term: "OnlyAnti",
        antiExample: "A tempting but wrong example.",
      }),
    ];
    const client = makeClient([
      { id: "x", term: "Distractor X" },
      { id: "y", term: "Distractor Y" },
      { id: "z", term: "Distractor Z" },
    ]);

    const questions = await generateSimpleQuiz(terms, client);

    const exampleQ = questions.find((q) => q.termId === "only-example");
    const antiQ = questions.find((q) => q.termId === "only-anti");

    expect(exampleQ?.type).toBe("multiple_choice");
    expect(antiQ?.type).toBe("multiple_choice");
    if (exampleQ?.type === "multiple_choice") {
      expect(exampleQ.correctOptionIds).toEqual(["only-example"]);
      expect(exampleQ.prompt).toBe("What does this illustrate?\nA real example.");
    }
    if (antiQ?.type === "multiple_choice") {
      expect(antiQ.correctOptionIds).toEqual(["none"]);
      expect(antiQ.prompt).toBe("What does this illustrate?\nA tempting but wrong example.");
      expect(antiQ.options.at(-1)).toEqual({ id: "none", text: "None of these" });
    }
  });

  it("falls back to definition multiple_choice for terms with neither field", async () => {
    const terms: QuizTerm[] = [makeTerm({ id: "plain", term: "Plain" })];
    const client = makeClient([
      { id: "x", term: "Distractor X" },
      { id: "y", term: "Distractor Y" },
      { id: "z", term: "Distractor Z" },
    ]);

    const questions = await generateSimpleQuiz(terms, client);

    expect(questions).toHaveLength(1);
    expect(questions[0].type).toBe("multiple_choice");
    expect(questions[0].prompt).toBe("A default definition.");
  });
});
