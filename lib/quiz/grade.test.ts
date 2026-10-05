import { describe, expect, it } from "vitest";
import { gradeAnswer } from "./grade";
import type { QuizBooleanQuestion, QuizChoiceQuestion, QuizTextQuestion } from "./types";

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

describe("gradeAnswer for text questions", () => {
  const text: QuizTextQuestion = {
    interaction: "text",
    template: "typed_cloze",
    termId: "term-1",
    prompt: "Type it",
    acceptedAnswers: ["het licht"],
    language: "nl",
  };

  it("accepts the word regardless of case and spacing", () => {
    expect(gradeAnswer(text, { interaction: "text", text: " Het  Licht " })).toBe(true);
  });

  it("rejects other words, a missing article and an empty answer", () => {
    expect(gradeAnswer(text, { interaction: "text", text: "licht" })).toBe(false);
    expect(gradeAnswer(text, { interaction: "text", text: "" })).toBe(false);
  });

  it("never passes a choice response", () => {
    expect(gradeAnswer(text, pick("a"))).toBe(false);
  });
});

describe("gradeAnswer with a mismatched response", () => {
  it("never passes", () => {
    expect(gradeAnswer(choice, { interaction: "boolean", value: true })).toBe(false);
    expect(gradeAnswer(boolean, pick("a"))).toBe(false);
  });
});
