import { describe, expect, it } from "vitest";
import { generateUniqueSlug, slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and dasherizes non-alphanumeric runs", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("collapses multiple separators into a single dash", () => {
    expect(slugify("foo   bar___baz")).toBe("foo-bar-baz");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("  --Weird Input!! ")).toBe("weird-input");
  });

  it("strips diacritics via unicode normalization", () => {
    expect(slugify("Café Déjà Vu")).toBe("cafe-deja-vu");
  });

  it("returns an empty string for input with no alphanumeric characters", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("generateUniqueSlug", () => {
  it("returns the plain slug when there's no collision", () => {
    expect(generateUniqueSlug("New Term", new Set())).toBe("new-term");
  });

  it("appends -2 on first collision", () => {
    expect(generateUniqueSlug("New Term", new Set(["new-term"]))).toBe("new-term-2");
  });

  it("keeps incrementing the suffix until a free slug is found", () => {
    const existing = new Set(["new-term", "new-term-2", "new-term-3"]);
    expect(generateUniqueSlug("New Term", existing)).toBe("new-term-4");
  });

  it("falls back to 'item' when the base slugifies to nothing", () => {
    expect(generateUniqueSlug("!!!", new Set())).toBe("item");
  });
});
