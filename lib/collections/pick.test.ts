import { describe, expect, it } from "vitest";
import { pickRelated, pickSpecimen } from "./pick";

const term = (slug: string, overrides: Record<string, unknown> = {}) => ({
  slug,
  term: slug,
  category: "A",
  definition: "Short meaning.",
  example: "An example.",
  ...overrides,
});

describe("pickSpecimen", () => {
  const terms = ["c", "a", "d", "b"].map((slug) => term(slug));

  it("picks the same term for the same collection, whatever the order", () => {
    const first = pickSpecimen("standup", terms);
    expect(pickSpecimen("standup", [...terms].reverse())).toEqual(first);
  });

  it("uses the pinned term when it exists", () => {
    expect(pickSpecimen("standup", terms, "d")?.slug).toBe("d");
    expect(pickSpecimen("standup", terms, "missing")).toBeDefined();
  });

  it("prefers short terms with an example", () => {
    const mixed = [
      term("long", { definition: "x".repeat(200) }),
      term("bare", { example: null }),
      term("good"),
    ];
    expect(pickSpecimen("anything", mixed)?.slug).toBe("good");
  });

  it("falls back to any term, and to nothing for an empty collection", () => {
    expect(pickSpecimen("x", [term("bare", { example: null })])?.slug).toBe("bare");
    expect(pickSpecimen("x", [])).toBeUndefined();
  });
});

describe("pickRelated", () => {
  const terms = [
    term("alpha"),
    term("bravo"),
    term("charlie"),
    term("delta"),
    term("other", { category: "B" }),
  ];

  it("takes the next terms in the same category, wrapping round", () => {
    expect(pickRelated(term("charlie"), terms).map((t) => t.slug)).toEqual([
      "delta",
      "alpha",
      "bravo",
    ]);
  });

  it("never includes the term itself or other categories", () => {
    const related = pickRelated(term("alpha"), terms, 10).map((t) => t.slug);
    expect(related).toEqual(["bravo", "charlie", "delta"]);
  });

  it("returns nothing for a term without a category", () => {
    expect(pickRelated(term("alpha", { category: null }), terms)).toEqual([]);
  });
});
