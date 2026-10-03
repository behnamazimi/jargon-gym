import { describe, expect, it } from "vitest";
import { describeSlugCheck, resolveSlug } from "./slug-check";

describe("resolveSlug", () => {
  it("normalises the text and says it is free", () => {
    expect(resolveSlug("Cooking Basics!", new Set())).toEqual({
      valid: true,
      slug: "cooking-basics",
      taken: false,
      suggestion: null,
      cut: false,
    });
  });

  it("offers the next free address when taken", () => {
    const result = resolveSlug("cooking", new Set(["cooking", "cooking-2"]));
    expect(result).toMatchObject({ taken: true, suggestion: "cooking-3", slug: "cooking" });
  });

  it("refuses text with no letters or digits instead of calling it 'item'", () => {
    expect(resolveSlug("!!!", new Set())).toMatchObject({ valid: false, slug: "" });
    expect(resolveSlug("   ", new Set())).toMatchObject({ valid: false });
  });

  it("says when a long address was cut", () => {
    const result = resolveSlug("word ".repeat(60), new Set());
    expect(result.cut).toBe(true);
    expect(result.slug.length).toBeLessThanOrEqual(100);
    expect(result.slug.endsWith("-")).toBe(false);
  });
});

describe("describeSlugCheck", () => {
  it("tells free, taken and invalid apart", () => {
    expect(describeSlugCheck(resolveSlug("kitchen", new Set()))).toBe(
      "/collections/kitchen is free.",
    );
    expect(describeSlugCheck(resolveSlug("kitchen", new Set(["kitchen"])))).toBe(
      "/collections/kitchen is taken. Try /collections/kitchen-2.",
    );
    expect(describeSlugCheck(resolveSlug("!!", new Set()))).toBe(
      "Use letters or numbers in the address.",
    );
  });
});
