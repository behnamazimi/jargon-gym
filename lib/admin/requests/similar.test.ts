import { describe, expect, it } from "vitest";
import { normalizeTopic, significantWords, topicsSimilar } from "./similar";

describe("topicsSimilar", () => {
  const cases: [string, string, string, boolean][] = [
    ["equal ignoring case and spaces", "Kubernetes  basics", " kubernetes BASICS ", true],
    ["one contains the other", "Kubernetes", "Kubernetes for product managers", true],
    ["unrelated", "Dutch kitchen words", "Kubernetes", false],
    ["a short word inside a longer one doesn't count", "ai", "Dutch kitchen", false],
    ["empty", "", "Kubernetes", false],
  ];

  it.each(cases)("%s", (_name, a, b, expected) => {
    expect(topicsSimilar(a, b)).toBe(expected);
  });
});

describe("significantWords", () => {
  it("keeps long words once, in order, up to four", () => {
    expect(significantWords("Kubernetes for the product managers of kubernetes teams")).toEqual([
      "kubernetes",
      "product",
      "managers",
      "teams",
    ]);
  });

  it("splits on punctuation and keeps accented letters", () => {
    expect(significantWords("café-menu; élèves")).toEqual(["café", "menu", "élèves"]);
  });

  it("returns nothing for short words only", () => {
    expect(significantWords("a to be")).toEqual([]);
  });
});

describe("normalizeTopic", () => {
  it("lowercases, trims and collapses spaces", () => {
    expect(normalizeTopic("  A   B ")).toBe("a b");
  });
});
