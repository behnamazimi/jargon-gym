import { describe, expect, it } from "vitest";
import type { QuizQuestion } from "./types";
import { missedQuestions, missedTermIds, scoredTotal } from "./results";

function question(termId: string): QuizQuestion {
  return {
    interaction: "boolean",
    template: "does_it_fit",
    termId,
    prompt: `Is ${termId} right?`,
    correctAnswer: true,
  };
}

describe("missedQuestions", () => {
  const questions = [question("a"), question("b"), question("c")];

  it("keeps only the questions answered wrong", () => {
    const answers = [
      { termId: "a", passed: true },
      { termId: "b", passed: false },
      { termId: "c", passed: false },
    ];
    expect(missedQuestions(questions, answers).map((q) => q.termId)).toEqual(["b", "c"]);
  });

  it("doesn't count unanswered questions as missed", () => {
    expect(missedQuestions(questions, [{ termId: "a", passed: false }])).toHaveLength(1);
  });

  it("doesn't count skipped questions as missed or toward the total", () => {
    const answers = [
      { termId: "a", passed: false, skipped: true },
      { termId: "b", passed: false },
    ];
    expect(missedQuestions(questions, answers).map((q) => q.termId)).toEqual(["b"]);
    expect(scoredTotal(questions.length, answers)).toBe(2);
  });
});

describe("missedTermIds", () => {
  it("lists a term missed twice once, in first-missed order", () => {
    const questions = [question("b"), question("a"), question("b")];
    const answers = [
      { termId: "b", passed: false },
      { termId: "a", passed: false },
      { termId: "b", passed: false },
    ];
    expect(missedTermIds(questions, answers)).toEqual(["b", "a"]);
  });
});
