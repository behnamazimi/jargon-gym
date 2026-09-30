import { describe, expect, it } from "vitest";
import { acceptedLength, countLength, storyLength, termsForLength } from "./length";

describe("storyLength", () => {
  it("follows the picked length", () => {
    expect(storyLength("short", "B2", "en")).toEqual({
      min: 40,
      max: 70,
      unit: "words",
      paragraphs: "1 or 2",
      turns: 5,
    });
    expect(storyLength("long", "C2", "en")).toMatchObject({ min: 120, max: 190 });
  });

  it("gives beginner levels more room", () => {
    expect(storyLength("medium", "A1", "nl")).toMatchObject({ min: 90, max: 150 });
    expect(storyLength("medium", "A2", "nl")).toMatchObject({ min: 80, max: 140 });
    expect(storyLength("medium", "B1", "nl")).toMatchObject({ min: 70, max: 120 });
  });
});

describe("termsForLength", () => {
  it("puts more terms in longer pieces", () => {
    expect(termsForLength("short")).toBeLessThan(termsForLength("medium"));
    expect(termsForLength("medium")).toBeLessThan(termsForLength("long"));
  });
});

describe("acceptedLength", () => {
  it("allows some slack around the asked-for range", () => {
    expect(acceptedLength(storyLength("medium", "B2", "en"))).toEqual({ min: 42, max: 156 });
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
