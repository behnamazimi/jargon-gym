import { describe, expect, it } from "vitest";
import { buildQuiz } from "./build";
import { makeDistractor, makeTerm, sourceOf } from "./test-support";

const distractors = [
  makeDistractor({ id: "d1", term: "One", definition: "first thing" }),
  makeDistractor({ id: "d2", term: "Two", definition: "second thing" }),
  makeDistractor({ id: "d3", term: "Three", definition: "third thing" }),
];

describe("buildQuiz", () => {
  it("builds one question per term, in order", async () => {
    const terms = [makeTerm({ id: "a" }), makeTerm({ id: "b" }), makeTerm({ id: "c" })];
    const questions = await buildQuiz(terms, sourceOf(distractors), "web");
    expect(questions.map((q) => q.termId)).toEqual(["a", "b", "c"]);
  });

  it("never shows the term in what the learner reads", async () => {
    const term = makeTerm({
      id: "a",
      term: "Parking lot",
      definition: "A parking lot holds off-topic items.",
      example: "Someone says parking lot and moves on.",
    });
    for (let run = 0; run < 40; run++) {
      const [question] = await buildQuiz([term], sourceOf(distractors), "web");
      if (question.interaction !== "choice") continue;

      const shown = [question.quote ?? "", ...question.options.map((o) => o.text)];
      if (question.template === "term_to_meaning") {
        expect(shown.join(" ")).not.toMatch(/parking lot/i);
      } else {
        expect(question.quote ?? "").not.toMatch(/parking lot/i);
      }
    }
  });

  it("falls back to the definition question when nothing else can be built", async () => {
    const term = makeTerm({ id: "a", kind: "vocabulary", example: "A sentence." });
    const [question] = await buildQuiz([term], sourceOf([]), "web");
    expect(question.template).toBe("definition_to_term");
  });

  it("picks templates by each term's own kind in a mixed quiz", async () => {
    const field = makeTerm({ id: "f", term: "Spike", example: "A Spike.", antiExample: "no" });
    const word = makeTerm({
      id: "w",
      kind: "vocabulary",
      term: "toch",
      example: "Je komt toch?",
      antiExample: "ignored",
    });
    const seen = { field: new Set<string>(), word: new Set<string>() };
    for (let run = 0; run < 80; run++) {
      const [f, w] = await buildQuiz([field, word], sourceOf(distractors), "web");
      seen.field.add(f.template);
      seen.word.add(w.template);
    }
    expect(seen.field.has("does_it_fit")).toBe(true);
    expect(seen.word.has("does_it_fit")).toBe(false);
    expect(seen.word.has("masked_example")).toBe(true);
  });

  it("never emits the retired 'None of these' option", async () => {
    const term = makeTerm({ id: "a", example: "x", antiExample: "y" });
    for (let run = 0; run < 40; run++) {
      const [question] = await buildQuiz([term], sourceOf(distractors), "web");
      if (question.interaction === "choice") {
        expect(question.options.map((o) => o.text)).not.toContain("None of these");
      }
    }
  });
});
