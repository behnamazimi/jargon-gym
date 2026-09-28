import { describe, expect, it } from "vitest";
import { largestQuizCount, quizCost, storyCost } from "./costs";

const costs = { quizPerQuestion: 1, storyPerTerm: 1 };

describe("quizCost and storyCost", () => {
  it("charge per question and per term", () => {
    expect(quizCost(12, costs)).toBe(12);
    expect(storyCost(8, costs)).toBe(8);
  });

  it("follow the admin's weights", () => {
    expect(quizCost(12, { ...costs, quizPerQuestion: 2 })).toBe(24);
    expect(storyCost(8, { ...costs, storyPerTerm: 3 })).toBe(24);
  });
});

describe("largestQuizCount", () => {
  it("never suggests more than was asked for", () => {
    expect(largestQuizCount(10, 50, costs)).toBe(10);
  });

  it("shrinks to what the balance covers", () => {
    expect(largestQuizCount(30, 6, costs)).toBe(6);
    expect(largestQuizCount(30, 7, { ...costs, quizPerQuestion: 2 })).toBe(3);
  });

  it("is zero when even one question is too much", () => {
    expect(largestQuizCount(10, 1, { ...costs, quizPerQuestion: 2 })).toBe(0);
  });
});
