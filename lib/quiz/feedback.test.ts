import { describe, expect, it } from "vitest";
import { quizFeedbackLine } from "./feedback";
import { ILLUSTRATION_QUESTION_LINE, NONE_OF_THESE_OPTION_ID } from "./illustration";
import type { QuizQuestion } from "./types";

const options = [
  { id: "cap", text: "CAP Theorem" },
  { id: "bp", text: "Backpressure" },
];

describe("quizFeedbackLine", () => {
  it("explains an anti-example, right or wrong", () => {
    const question: QuizQuestion = {
      type: "multiple_choice",
      termId: "cap",
      prompt: `${ILLUSTRATION_QUESTION_LINE}\nTreating CAP as tunable.`,
      options: [...options, { id: NONE_OF_THESE_OPTION_ID, text: "None of these" }],
      correctOptionIds: [NONE_OF_THESE_OPTION_ID],
    };
    const line = "This is an anti-example of CAP Theorem: it shows what the term is not.";
    expect(quizFeedbackLine(question, false)).toBe(line);
    expect(quizFeedbackLine(question, true)).toBe(line);
  });

  it("names the term for a missed example question", () => {
    const question: QuizQuestion = {
      type: "multiple_choice",
      termId: "cap",
      prompt: `${ILLUSTRATION_QUESTION_LINE}\nA real example.`,
      options,
      correctOptionIds: ["cap"],
    };
    expect(quizFeedbackLine(question, false)).toBe("This shows CAP Theorem.");
    expect(quizFeedbackLine(question, true)).toBeNull();
  });

  it("names the term for a missed definition question", () => {
    const question: QuizQuestion = {
      type: "multiple_choice",
      termId: "bp",
      prompt: "A signal telling a producer to slow down.",
      options,
      correctOptionIds: ["bp"],
    };
    expect(quizFeedbackLine(question, false)).toBe("That definition is for Backpressure.");
    expect(quizFeedbackLine(question, true)).toBeNull();
  });

  it("adds nothing for true/false", () => {
    const question: QuizQuestion = {
      type: "true_false",
      termId: "cap",
      prompt: "CAP is about three guarantees.",
      correctAnswer: true,
    };
    expect(quizFeedbackLine(question, false)).toBeNull();
  });
});
