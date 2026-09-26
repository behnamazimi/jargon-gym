import { describe, expect, it } from "vitest";
import { filterTerms } from "./filter-terms";
import type { FilterOptions, Term } from "./types";

function makeTerm(overrides: Partial<Term> & Pick<Term, "id" | "term">): Term {
  return {
    category: "General",
    definition: "",
    example: "",
    discussion: "",
    relationships: [],
    ...overrides,
  };
}

const baseOptions: FilterOptions = {
  searchQuery: "",
  activeCategories: new Set(),
  hideKnown: false,
  sortMode: "default",
  knownTerms: new Set(),
  markedKnownTerms: new Set(),
};

describe("filterTerms hideKnown", () => {
  it("excludes a term that's only in markedKnownTerms, not knownTerms", () => {
    const terms = [makeTerm({ id: "a", term: "Alpha" }), makeTerm({ id: "b", term: "Beta" })];
    const result = filterTerms(terms, {
      ...baseOptions,
      hideKnown: true,
      markedKnownTerms: new Set(["a"]),
    });
    expect(result.map((t) => t.id)).toEqual(["b"]);
  });
});

describe("filterTerms sortMode", () => {
  const terms = [
    makeTerm({ id: "a", term: "Zeta", category: "B" }),
    makeTerm({ id: "b", term: "Beta", category: "A" }),
    makeTerm({ id: "c", term: "Alpha", category: "B" }),
  ];

  it("keeps the query order by default", () => {
    const result = filterTerms(terms, baseOptions);
    expect(result.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts by category, then term", () => {
    const result = filterTerms(terms, { ...baseOptions, sortMode: "category" });
    expect(result.map((t) => t.id)).toEqual(["b", "c", "a"]);
  });
});

describe("filterTerms sortMode unknown", () => {
  it("sorts a marked-known-only term after unknown terms", () => {
    const terms = [makeTerm({ id: "a", term: "Alpha" }), makeTerm({ id: "b", term: "Beta" })];
    const result = filterTerms(terms, {
      ...baseOptions,
      sortMode: "unknown",
      markedKnownTerms: new Set(["a"]),
    });
    expect(result.map((t) => t.id)).toEqual(["b", "a"]);
  });
});
