import { describe, expect, it } from "vitest";
import { parseLibraryFilters } from "./library-filters";

const defaults = { hideKnown: false, sortMode: "default", categoriesByDomain: {} };

describe("parseLibraryFilters", () => {
  it("reads stored choices", () => {
    const raw = JSON.stringify({
      hideKnown: true,
      sortMode: "az",
      categoriesByDomain: { d1: ["Theory", "Design"] },
    });
    expect(parseLibraryFilters(raw)).toEqual({
      hideKnown: true,
      sortMode: "az",
      categoriesByDomain: { d1: ["Theory", "Design"] },
    });
  });

  it("falls back to defaults for empty or corrupt values", () => {
    expect(parseLibraryFilters("")).toEqual(defaults);
    expect(parseLibraryFilters(null)).toEqual(defaults);
    expect(parseLibraryFilters("{oops")).toEqual(defaults);
    expect(parseLibraryFilters("[]")).toEqual(defaults);
  });

  it("drops unknown sort modes and malformed category lists", () => {
    const raw = JSON.stringify({
      hideKnown: "yes",
      sortMode: "random",
      categoriesByDomain: { d1: ["Theory", 3], d2: ["Design"] },
    });
    expect(parseLibraryFilters(raw)).toEqual({
      hideKnown: false,
      sortMode: "default",
      categoriesByDomain: { d2: ["Design"] },
    });
  });
});
