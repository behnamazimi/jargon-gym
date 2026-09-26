import { describe, expect, it } from "vitest";
import { acceptedLength, countLength, storyLength } from "./length";

describe("storyLength", () => {
  it("keeps a floor for few terms", () => {
    expect(storyLength(3, "C2", "en")).toEqual({ min: 70, max: 120, unit: "words" });
  });

  it("grows with the term count", () => {
    expect(storyLength(6, "B2", "en")).toEqual({ min: 90, max: 140, unit: "words" });
  });

  it("gives beginner levels more room", () => {
    const a1 = storyLength(6, "A1", "nl");
    const b2 = storyLength(6, "B2", "nl");
    expect(a1.min).toBeGreaterThan(b2.min);
    expect(a1.max).toBeGreaterThan(b2.max);
  });
});

describe("acceptedLength", () => {
  it("allows some slack around the asked-for range", () => {
    expect(acceptedLength({ min: 70, max: 120, unit: "words" })).toEqual({ min: 42, max: 156 });
  });
});

describe("countLength", () => {
  it("counts words", () => {
    expect(countLength("It's a cold, wet day.", "words")).toBe(6);
  });

  it("counts characters without spaces or punctuation", () => {
    expect(countLength("今日は 寒い。", "characters")).toBe(5);
  });
});
