import { describe, expect, it } from "vitest";
import { traceQuestionType } from "./trace-type";

describe("traceQuestionType", () => {
  it("maps by interaction, not by template", () => {
    expect(
      traceQuestionType({
        interaction: "choice",
        template: "masked_example",
        termId: "t",
        prompt: "p",
        options: [],
        correctOptionIds: [],
      }),
    ).toBe("multiple_choice");
    expect(
      traceQuestionType({
        interaction: "boolean",
        template: "does_it_fit",
        termId: "t",
        prompt: "p",
        correctAnswer: true,
      }),
    ).toBe("true_false");
  });
});
