import { describe, expect, it } from "vitest";
import { largestFittingLength, storyCostForLength } from "./credit-fit";

const costs = { quizPerQuestion: 1, storyPerTerm: 1 };

describe("storyCostForLength", () => {
  it("charges one credit per term the story will use", () => {
    expect(storyCostForLength("short", 50, costs)).toBe(6);
    expect(storyCostForLength("medium", 50, costs)).toBe(8);
    expect(storyCostForLength("long", 50, costs)).toBe(10);
  });

  it("only counts the terms that are actually eligible", () => {
    expect(storyCostForLength("long", 4, costs)).toBe(4);
  });

  it("follows the admin's per-term weight", () => {
    expect(storyCostForLength("medium", 50, { ...costs, storyPerTerm: 2 })).toBe(16);
  });
});

describe("largestFittingLength", () => {
  it("suggests the longest shorter length that fits", () => {
    expect(largestFittingLength("long", 50, 8, costs)).toBe("medium");
    expect(largestFittingLength("long", 50, 6, costs)).toBe("short");
  });

  it("returns null when nothing shorter fits", () => {
    expect(largestFittingLength("long", 50, 5, costs)).toBeNull();
    expect(largestFittingLength("short", 50, 0, costs)).toBeNull();
  });
});
