import { describe, expect, it } from "vitest";
import { largestQuizCount, narrationCost, quizCost, storyCost } from "./costs";
import { testCosts as costs } from "./test-costs";

describe("quizCost", () => {
  it("charges per question", () => {
    expect(quizCost(12, costs)).toBe(12);
  });

  it("follows the price row", () => {
    expect(quizCost(12, { ...costs, quiz: { ...costs.quiz, creditsPerUnit: 2 } })).toBe(24);
  });
});

describe("storyCost", () => {
  it("is a base plus a share per term, rounded up", () => {
    expect(storyCost(3, costs)).toBe(4);
    expect(storyCost(6, costs)).toBe(5);
    expect(storyCost(7, costs)).toBe(6);
    expect(storyCost(10, costs)).toBe(7);
  });
});

describe("narrationCost", () => {
  it("charges per 1,000 characters, rounded up per story", () => {
    expect(narrationCost(524, costs)).toBe(4);
    expect(narrationCost(1009, costs)).toBe(8);
    expect(narrationCost(1737, costs)).toBe(14);
  });

  it("is at least one credit", () => {
    expect(narrationCost(1, costs)).toBe(1);
  });

  it("does not round exact amounts up", () => {
    expect(narrationCost(400, costs)).toBe(3);
  });
});

describe("largestQuizCount", () => {
  it("never exceeds what was asked for", () => {
    expect(largestQuizCount(10, 50, costs)).toBe(10);
  });

  it("shrinks to what the balance covers", () => {
    expect(largestQuizCount(30, 6, costs)).toBe(6);
    expect(largestQuizCount(30, 7, { ...costs, quiz: { ...costs.quiz, creditsPerUnit: 2 } })).toBe(
      3,
    );
  });

  it("is zero when not even one question fits", () => {
    expect(largestQuizCount(10, 1, { ...costs, quiz: { ...costs.quiz, creditsPerUnit: 2 } })).toBe(
      0,
    );
  });
});
