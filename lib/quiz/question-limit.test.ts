import { describe, expect, it } from "vitest";
import { maxQuizQuestions } from "./question-limit";

describe("maxQuizQuestions", () => {
  it("caps AI quizzes at 10 even when more terms are available", () => {
    expect(maxQuizQuestions("ai", 26)).toBe(10);
    expect(maxQuizQuestions("ai", 10)).toBe(10);
  });

  it("lets an AI quiz use fewer terms when the collection is small", () => {
    expect(maxQuizQuestions("ai", 4)).toBe(4);
    expect(maxQuizQuestions("ai", 0)).toBe(0);
  });

  it("leaves simple quizzes at the study limit", () => {
    expect(maxQuizQuestions("simple", 26)).toBe(26);
    expect(maxQuizQuestions("simple", 100)).toBe(30);
  });
});
