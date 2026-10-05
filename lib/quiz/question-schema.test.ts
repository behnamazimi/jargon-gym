import { describe, expect, it } from "vitest";
import { isQuizQuestion } from "./question-schema";

describe("isQuizQuestion", () => {
  it("accepts both interactions", () => {
    expect(
      isQuizQuestion({
        interaction: "choice",
        template: "masked_example",
        termId: "t",
        prompt: "p",
        quote: "q",
        options: [{ id: "t", text: "T" }],
        correctOptionIds: ["t"],
      }),
    ).toBe(true);
    expect(
      isQuizQuestion({
        interaction: "boolean",
        template: "does_it_fit",
        termId: "t",
        prompt: "p",
        correctAnswer: false,
      }),
    ).toBe(true);
  });

  it("accepts a typed question and rejects one with no accepted answer", () => {
    const typed = {
      interaction: "text",
      template: "typed_cloze",
      termId: "t",
      prompt: "p",
      quote: "q",
      hint: "h",
      acceptedAnswers: ["x"],
      language: "nl",
    };
    expect(isQuizQuestion(typed)).toBe(true);
    expect(isQuizQuestion({ ...typed, acceptedAnswers: [] })).toBe(false);
    expect(isQuizQuestion({ ...typed, language: "xx" })).toBe(false);
  });

  it("rejects the old stored shape and unknown templates", () => {
    expect(isQuizQuestion({ type: "multiple_choice", termId: "t", prompt: "p", options: [] })).toBe(
      false,
    );
    expect(
      isQuizQuestion({
        interaction: "boolean",
        template: "mystery",
        termId: "t",
        prompt: "p",
        correctAnswer: true,
      }),
    ).toBe(false);
  });
});
