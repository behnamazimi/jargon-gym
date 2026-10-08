import { describe, expect, it } from "vitest";
import {
  decodeLibraryFilters,
  parseLibraryFilters,
  readLibraryFiltersCookie,
  serializeLibraryFilters,
} from "./library-filters";

const defaults = { hideKnown: false, sortMode: "default", categoriesByCollection: {} };

describe("parseLibraryFilters", () => {
  it("reads stored choices", () => {
    const raw = JSON.stringify({
      hideKnown: true,
      sortMode: "az",
      categoriesByCollection: { d1: ["Theory", "Design"] },
    });
    expect(parseLibraryFilters(raw)).toEqual({
      hideKnown: true,
      sortMode: "az",
      categoriesByCollection: { d1: ["Theory", "Design"] },
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
      categoriesByCollection: { d1: ["Theory", 3], d2: ["Design"] },
    });
    expect(parseLibraryFilters(raw)).toEqual({
      hideKnown: false,
      sortMode: "default",
      categoriesByCollection: { d2: ["Design"] },
    });
  });
});

describe("serializeLibraryFilters", () => {
  it("keeps only the 20 most recently changed collections", () => {
    const categoriesByCollection = Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [`d${i}`, ["Theory"]]),
    );
    const stored = JSON.parse(
      decodeURIComponent(
        serializeLibraryFilters({ hideKnown: true, sortMode: "az", categoriesByCollection }),
      ),
    );
    expect(Object.keys(stored.categoriesByCollection)).toEqual(
      Array.from({ length: 20 }, (_, i) => `d${i + 5}`),
    );
    expect(stored.hideKnown).toBe(true);
    expect(stored.sortMode).toBe("az");
  });

  it("drops collections with no category chosen", () => {
    const stored = JSON.parse(
      decodeURIComponent(
        serializeLibraryFilters({
          hideKnown: false,
          sortMode: "default",
          categoriesByCollection: { d1: [], d2: ["Design"] },
        }),
      ),
    );
    expect(stored.categoriesByCollection).toEqual({ d2: ["Design"] });
  });
});

describe("cookie size", () => {
  it("drops the oldest collections until the cookie fits", () => {
    const longNames = Array.from({ length: 8 }, (_, i) => `Категория номер ${i}`);
    const categoriesByCollection = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`collection-${i}`, longNames]),
    );
    const value = serializeLibraryFilters({
      hideKnown: true,
      sortMode: "az",
      categoriesByCollection,
    });
    expect(value.length).toBeLessThanOrEqual(3500);

    const kept = Object.keys(decodeLibraryFilters(value).categoriesByCollection);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(20);
    expect(kept.at(-1)).toBe("collection-19");
    expect(decodeLibraryFilters(value).hideKnown).toBe(true);
  });
});

describe("reading the cookie", () => {
  it("round-trips through the encoded cookie value", () => {
    const filters = {
      hideKnown: true,
      sortMode: "unknown" as const,
      categoriesByCollection: { d1: ["A; B", "100%"] },
    };
    const value = serializeLibraryFilters(filters);
    const header = `other=1; lb_lib_filters=${value}; theme=dark`;
    expect(decodeLibraryFilters(readLibraryFiltersCookie(header))).toEqual(filters);
  });

  it("falls back to defaults when the cookie is missing or broken", () => {
    expect(decodeLibraryFilters(readLibraryFiltersCookie("theme=dark"))).toEqual(defaults);
    expect(decodeLibraryFilters("%E0%A4%A")).toEqual(defaults);
  });
});
