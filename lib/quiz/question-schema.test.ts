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
