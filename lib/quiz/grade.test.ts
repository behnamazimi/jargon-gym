import { describe, expect, it } from "vitest";
import { gradeMcqAnswer, gradeTrueFalseAnswer } from "./grade";
import type { QuizMcqQuestion, QuizTrueFalseQuestion } from "./types";

const mcq: QuizMcqQuestion = {
  type: "multiple_choice",
  termId: "term-1",
  prompt: "Pick the right ones",
  options: [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
    { id: "c", text: "C" },
  ],
  correctOptionIds: ["a", "b"],
};

describe("gradeMcqAnswer", () => {
  it("passes on an exact match", () => {
    expect(gradeMcqAnswer(mcq, ["a", "b"])).toBe(true);
  });

  it("is order-independent", () => {
    expect(gradeMcqAnswer(mcq, ["b", "a"])).toBe(true);
  });

  it("fails on a partial selection", () => {
    expect(gradeMcqAnswer(mcq, ["a"])).toBe(false);
  });

  it("fails when an extra, incorrect option is included", () => {
    expect(gradeMcqAnswer(mcq, ["a", "b", "c"])).toBe(false);
  });

  it("fails on an empty selection", () => {
    expect(gradeMcqAnswer(mcq, [])).toBe(false);
  });

  it("fails on a completely wrong selection", () => {
    expect(gradeMcqAnswer(mcq, ["c"])).toBe(false);
  });
});

describe("gradeTrueFalseAnswer", () => {
  const question: QuizTrueFalseQuestion = {
    type: "true_false",
    termId: "term-2",
    prompt: "Is this true?",
    correctAnswer: true,
  };

  it("passes when the answer matches", () => {
    expect(gradeTrueFalseAnswer(question, true)).toBe(true);
  });

  it("fails when the answer doesn't match", () => {
    expect(gradeTrueFalseAnswer(question, false)).toBe(false);
  });
});
