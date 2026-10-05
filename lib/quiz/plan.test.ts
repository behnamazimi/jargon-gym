import { describe, expect, it } from "vitest";
import { orderTemplates } from "./plan";
import { makeTerm, rngOf } from "./test-support";

describe("orderTemplates", () => {
  it("only includes templates the term is eligible for", () => {
    const ids = orderTemplates(makeTerm(), "web", rngOf(0.5)).map((t) => t.id);
    expect(ids.sort()).toEqual(["definition_to_term", "term_to_meaning"]);
  });

  it("adds example-based templates when the term has an example", () => {
    const term = makeTerm({ term: "Spike", example: "We ran a Spike.", antiExample: "x" });
    const ids = orderTemplates(term, "web", rngOf(0.5)).map((t) => t.id);
    expect(ids.sort()).toEqual([
      "definition_to_term",
      "does_it_fit",
      "masked_example",
      "term_to_meaning",
    ]);
  });

  it("leaves out field-term-only templates for vocabulary", () => {
    const term = makeTerm({ kind: "vocabulary", antiExample: "x" });
    expect(orderTemplates(term, "web", rngOf(0.5)).map((t) => t.id)).not.toContain("does_it_fit");
  });

  it("orders by weight when the draws are equal", () => {
    const term = makeTerm({ term: "Spike", example: "We ran a Spike.", antiExample: "x" });
    const ids = orderTemplates(term, "web", rngOf(0.5)).map((t) => t.id);
    expect(ids.at(-1)).toBe("does_it_fit");
  });

  it("can put a low-weight template first on a lucky draw", () => {
    const term = makeTerm({ term: "Spike", example: "We ran a Spike.", antiExample: "x" });
    // Draws in registry order: definition, meaning, masked, does_it_fit.
    const ids = orderTemplates(term, "web", rngOf(0.1, 0.1, 0.1, 0.99)).map((t) => t.id);
    expect(ids[0]).toBe("does_it_fit");
  });

  describe("typed templates", () => {
    const known = {
      kind: "vocabulary" as const,
      term: "fietsen",
      example: "We fietsen naar het strand.",
      recognition: { posterior: 0.9, testCount: 3 },
    };

    it("join the plan for a known vocabulary term and usually come first", () => {
      const ids = orderTemplates(makeTerm(known), "web", rngOf(0.5)).map((t) => t.id);
      expect(ids).toEqual(expect.arrayContaining(["typed_cloze", "typed_meaning_to_word"]));
      expect(ids[0]).toBe("typed_cloze");
    });

    it("stay out for a term the learner doesn't know yet", () => {
      const weak = makeTerm({ ...known, recognition: { posterior: 0.4, testCount: 3 } });
      const ids = orderTemplates(weak, "web", rngOf(0.5)).map((t) => t.id);
      expect(ids).not.toContain("typed_cloze");
      expect(ids).not.toContain("typed_meaning_to_word");
    });

    it("stay out for field terms and for Telegram", () => {
      const field = makeTerm({ ...known, kind: "terms" });
      expect(orderTemplates(field, "web", rngOf(0.5)).map((t) => t.id)).not.toContain(
        "typed_cloze",
      );
      expect(
        orderTemplates(makeTerm(known), "telegram", rngOf(0.5)).map((t) => t.id),
      ).not.toContain("typed_cloze");
    });
  });
});
