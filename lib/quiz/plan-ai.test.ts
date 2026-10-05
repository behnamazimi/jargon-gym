import { describe, expect, it } from "vitest";
import { planAiQuiz } from "./plan-ai";
import { makeDistractor, makeTerm, rngOf, sourceOf } from "./test-support";

const source = sourceOf([makeDistractor({ id: "d1" }), makeDistractor({ id: "d2" })]);

describe("planAiQuiz", () => {
  it("can plan example-based templates for a term that has no example", async () => {
    const term = makeTerm({ id: "a", example: null, antiExample: null });
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const plan = await planAiQuiz([term], source);
      plan.slots.forEach((slot) => seen.add(slot.template.id));
    }
    expect(seen.has("masked_example")).toBe(true);
    expect(seen.has("does_it_fit")).toBe(true);
  });

  it("keeps does-it-fit for field terms only", async () => {
    const word = makeTerm({ id: "w", kind: "vocabulary" });
    for (let i = 0; i < 40; i++) {
      const plan = await planAiQuiz([word], source);
      expect(plan.slots.map((slot) => slot.template.id)).not.toContain("does_it_fit");
    }
  });

  it("builds a typed question for a known vocabulary term instead of asking the model", async () => {
    const term = makeTerm({
      id: "w",
      kind: "vocabulary",
      term: "toch",
      example: "Je komt toch?",
      recognition: { posterior: 0.9, testCount: 2 },
    });
    const plan = await planAiQuiz([term], source, rngOf(0.5));
    expect(plan.slots).toEqual([]);
    expect(plan.built.get("w")?.interaction).toBe("text");
  });

  it("hands a term back to the model when its typed question can't be built", async () => {
    const term = makeTerm({
      id: "w",
      kind: "vocabulary",
      term: "lopen",
      definition: "to walk",
      example: null,
      recognition: { posterior: 0.9, testCount: 2 },
    });
    const sharedGloss = sourceOf([], [makeDistractor({ id: "x", definition: "to walk" })]);
    for (let i = 0; i < 30; i++) {
      const plan = await planAiQuiz([term], sharedGloss);
      expect(plan.built.get("w")?.template).not.toBe("typed_meaning_to_word");
      expect(plan.slots.length + plan.built.size).toBe(1);
    }
  });

  it("keeps the slots in term order", async () => {
    const terms = [makeTerm({ id: "a" }), makeTerm({ id: "b" }), makeTerm({ id: "c" })];
    const plan = await planAiQuiz(terms, source);
    expect(plan.slots.map((slot) => slot.term.id)).toEqual(["a", "b", "c"]);
  });
});
