import { describe, expect, it } from "vitest";
import { gradeAnswer } from "./grade";
import type { QuizBooleanQuestion, QuizChoiceQuestion } from "./types";

const choice: QuizChoiceQuestion = {
  interaction: "choice",
  template: "definition_to_term",
  termId: "term-1",
  prompt: "Pick the right ones",
  options: [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
    { id: "c", text: "C" },
  ],
  correctOptionIds: ["a", "b"],
};

const boolean: QuizBooleanQuestion = {
  interaction: "boolean",
  template: "does_it_fit",
  termId: "term-1",
  prompt: "Is this right?",
  correctAnswer: true,
};

const pick = (...optionIds: string[]) => ({ interaction: "choice" as const, optionIds });

describe("gradeAnswer for choice questions", () => {
  it("passes on an exact match, in any order", () => {
    expect(gradeAnswer(choice, pick("a", "b"))).toBe(true);
    expect(gradeAnswer(choice, pick("b", "a"))).toBe(true);
  });

  it("fails on a partial, extra, empty or wrong selection", () => {
    expect(gradeAnswer(choice, pick("a"))).toBe(false);
    expect(gradeAnswer(choice, pick("a", "b", "c"))).toBe(false);
    expect(gradeAnswer(choice, pick())).toBe(false);
    expect(gradeAnswer(choice, pick("c"))).toBe(false);
  });
});

describe("gradeAnswer for boolean questions", () => {
  it("compares to the correct answer", () => {
    expect(gradeAnswer(boolean, { interaction: "boolean", value: true })).toBe(true);
    expect(gradeAnswer(boolean, { interaction: "boolean", value: false })).toBe(false);
  });
});

describe("gradeAnswer with a mismatched response", () => {
  it("never passes", () => {
    expect(gradeAnswer(choice, { interaction: "boolean", value: true })).toBe(false);
    expect(gradeAnswer(boolean, pick("a"))).toBe(false);
  });
});
