import { generateObject } from "ai";
import { describe, expect, it, vi } from "vitest";
import { planAiQuiz } from "./plan-ai";
import { generateQuizQuestions } from "./generate";
import { templateById } from "./templates/registry";
import { makeDistractor, makeTerm, rngOf, sourceOf } from "./test-support";
import type { QuizTerm } from "./types";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

const source = sourceOf([
  makeDistractor({ id: "d1", term: "One", definition: "first thing" }),
  makeDistractor({ id: "d2", term: "Two", definition: "second thing" }),
  makeDistractor({ id: "d3", term: "Three", definition: "third thing" }),
]);

/**
 * Stands in for the model: reads each term's id, template and term name from the
 * prompt and answers in the shape that template asks for. `skip` leaves some
 * terms unanswered.
 */
function fakeModel(skip: (termId: string) => boolean = () => false) {
  vi.mocked(generateObject).mockImplementation((async ({ prompt }: { prompt: string }) => {
    const lines = prompt.split("\n");
    const questions: unknown[] = [];

    lines.forEach((line, i) => {
      const id = /^- id: (.+)$/.exec(line)?.[1];
      if (!id || skip(id)) return;
      const template = /^ {2}template: (.+)$/.exec(lines[i + 1])?.[1] ?? "";
      const termName = JSON.parse(/^ {2}term: (.+)$/.exec(lines[i + 2])?.[1] ?? '""') as string;
      const ai = templateById(template as never)?.ai;

      const quote = ai?.writesQuote ? { quote: `Someone uses ${termName} here.` } : {};
      questions.push(
        ai?.interaction === "boolean"
          ? { type: "true_false", termId: id, ...quote, correctAnswer: true }
          : {
              type: "multiple_choice",
              termId: id,
              ...quote,
              options: [
                { id: "a", text: termName },
                { id: "b", text: "B" },
                { id: "c", text: "C" },
                { id: "d", text: "D" },
              ],
              correctOptionIds: ["a"],
            },
      );
    });

    return { object: { questions } };
  }) as never);
}

const field = (i: number): QuizTerm =>
  makeTerm({ id: `t${i}`, term: `Term${i}`, definition: `Meaning of Term${i}.` });

const known = { posterior: 0.9, testCount: 3 };

describe("generateQuizQuestions", () => {
  it("returns one finished question per term, in order", async () => {
    fakeModel();
    const terms = Array.from({ length: 8 }, (_, i) => field(i));
    const plan = await planAiQuiz(terms, source, rngOf(0.3, 0.6, 0.9));

    const questions = await generateQuizQuestions({
      provider: "anthropic",
      apiKey: "k",
      plan,
      source,
    });

    expect(questions.map((q) => q.termId)).toEqual(terms.map((t) => t.id));
    for (const q of questions) {
      expect(["definition_to_term", "term_to_meaning", "masked_example", "does_it_fit"]).toContain(
        q.template,
      );
    }
  });

  it("reports the model call's usage", async () => {
    fakeModel();
    const usage = { inputTokens: 600, outputTokens: 400 };
    const original = vi.mocked(generateObject).getMockImplementation()!;
    vi.mocked(generateObject).mockImplementation((async (args: never) => ({
      ...(await (original as (a: never) => Promise<object>)(args)),
      usage,
    })) as never);
    const terms = [field(0), field(1)];
    const plan = await planAiQuiz(terms, source, rngOf(0.5));
    const onUsage = vi.fn();
    await generateQuizQuestions({ provider: "anthropic", apiKey: "k", plan, source, onUsage });
    expect(onUsage).toHaveBeenCalledWith(usage);
  });

  it("only makes booleans from does-it-fit, so true/false stays a small share", async () => {
    fakeModel();
    const terms = Array.from({ length: 30 }, (_, i) => field(i));
    const plan = await planAiQuiz(terms, source);
    const questions = await generateQuizQuestions({
      provider: "anthropic",
      apiKey: "k",
      plan,
      source,
    });

    const booleans = questions.filter((q) => q.interaction === "boolean");
    expect(booleans.every((q) => q.template === "does_it_fit")).toBe(true);
    expect(booleans.length).toBeLessThan(terms.length / 2);
  });

  it("builds typed questions itself and never sends those terms to the model", async () => {
    fakeModel();
    const typedTerm = makeTerm({
      id: "typed",
      kind: "vocabulary",
      term: "fietsen",
      definition: "to cycle",
      example: "We fietsen naar het strand.",
      recognition: known,
    });
    // With this rng the typed template comes first for a known vocabulary term.
    const forced = await planAiQuiz([typedTerm], source, rngOf(0.5));
    expect(forced.slots).toHaveLength(0);
    expect(forced.built.get("typed")?.interaction).toBe("text");

    vi.mocked(generateObject).mockClear();
    const questions = await generateQuizQuestions({
      provider: "anthropic",
      apiKey: "k",
      plan: forced,
      source,
    });
    expect(generateObject).not.toHaveBeenCalled();
    expect(questions).toHaveLength(1);
  });

  it("gives a term the model skipped a simple question, so the quiz keeps its length", async () => {
    fakeModel((id) => id === "t1");
    const terms = [field(0), field(1), field(2)];
    const plan = await planAiQuiz(terms, source, rngOf(0.5));

    const questions = await generateQuizQuestions({
      provider: "anthropic",
      apiKey: "k",
      plan,
      source,
    });

    expect(questions.map((q) => q.termId)).toEqual(["t0", "t1", "t2"]);
  });

  it("fails, so the charge is refunded, when the model returns nothing usable", async () => {
    vi.mocked(generateObject).mockResolvedValue({ object: { questions: [] } } as never);
    const plan = await planAiQuiz([field(0)], source, rngOf(0.5));

    await expect(
      generateQuizQuestions({ provider: "anthropic", apiKey: "k", plan, source }),
    ).rejects.toThrow(/none passed validation/);
  });

  it("rejects an empty term list", async () => {
    await expect(
      generateQuizQuestions({
        provider: "anthropic",
        apiKey: "k",
        plan: { terms: [], built: new Map(), slots: [] },
        source,
      }),
    ).rejects.toThrow("No terms");
  });
});
