import { describe, expect, it } from "vitest";
import { FEATURE_SECTIONS, type FeatureSection } from "./sections";

function strings(section: FeatureSection): string[] {
  const own = [section.title, ...("lead" in section ? [section.lead] : [])];
  if (section.layout === "chips") return [...own, ...section.items];
  return [...own, ...section.items.flatMap((item) => [item.title, item.body])];
}

const allText = FEATURE_SECTIONS.flatMap(strings);

describe("feature sections", () => {
  it("gives every section a unique slug id", () => {
    const ids = FEATURE_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("has no empty copy", () => {
    for (const text of allText) expect(text.trim()).not.toBe("");
  });

  it("gives every item in a section a unique title", () => {
    for (const section of FEATURE_SECTIONS) {
      if (section.layout === "chips") continue;
      const titles = section.items.map((item) => item.title);
      expect(new Set(titles).size).toBe(titles.length);
    }
  });

  it("says terms, not jargon", () => {
    for (const text of allText) expect(text).not.toMatch(/jargon/i);
  });

  it("does not name the admin or imply automation", () => {
    for (const text of allText) expect(text).not.toMatch(/\badmin|moderator|automatic/i);
  });
});
