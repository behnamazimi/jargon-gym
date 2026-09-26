import { describe, expect, it } from "vitest";
import { acceptedLength, countLength, storyLength, termsForLength } from "./length";

describe("storyLength", () => {
  it("follows the picked length", () => {
    expect(storyLength("short", "B2", "en")).toEqual({
      min: 50,
      max: 90,
      unit: "words",
      paragraphs: "1 or 2",
      turns: 5,
    });
    expect(storyLength("long", "C2", "en")).toMatchObject({ min: 160, max: 240 });
  });

  it("gives beginner levels more room", () => {
    expect(storyLength("medium", "A1", "nl")).toMatchObject({ min: 115, max: 190 });
    expect(storyLength("medium", "A2", "nl")).toMatchObject({ min: 105, max: 175 });
    expect(storyLength("medium", "B1", "nl")).toMatchObject({ min: 90, max: 150 });
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
    expect(acceptedLength(storyLength("medium", "B2", "en"))).toEqual({ min: 54, max: 195 });
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
