import { describe, expect, it } from "vitest";
import { quizResponseForKey } from "./keyboard";
import type { QuizQuestion } from "./types";

const mcq: QuizQuestion = {
  interaction: "choice",
  template: "definition_to_term",
  termId: "t",
  prompt: "Which?",
  options: [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
    { id: "c", text: "C" },
  ],
  correctOptionIds: ["a"],
};

const trueFalse: QuizQuestion = {
  interaction: "boolean",
  template: "does_it_fit",
  termId: "t",
  prompt: "True?",
  correctAnswer: true,
};

const typed: QuizQuestion = {
  interaction: "text",
  template: "typed_cloze",
  termId: "t",
  prompt: "Type it",
  acceptedAnswers: ["x"],
  language: "en",
};

const key = (value: string, extra = {}) => ({ key: value, typing: false, ...extra });

describe("quizResponseForKey", () => {
  it("maps digits to options in display order", () => {
    expect(quizResponseForKey(key("1"), mcq)).toEqual({ interaction: "choice", optionIds: ["a"] });
    expect(quizResponseForKey(key("3"), mcq)).toEqual({ interaction: "choice", optionIds: ["c"] });
  });

  it("ignores digits past the last option", () => {
    expect(quizResponseForKey(key("4"), mcq)).toBeNull();
    expect(quizResponseForKey(key("3"), trueFalse)).toBeNull();
  });

  it("maps 1 to the first boolean label and 2 to the second", () => {
    expect(quizResponseForKey(key("1"), trueFalse)).toEqual({
      interaction: "boolean",
      value: true,
    });
    expect(quizResponseForKey(key("2"), trueFalse)).toEqual({
      interaction: "boolean",
      value: false,
    });
  });

  it("ignores modified, held, typed and non-digit keys", () => {
    expect(quizResponseForKey(key("1", { metaKey: true }), mcq)).toBeNull();
    expect(quizResponseForKey(key("1", { ctrlKey: true }), mcq)).toBeNull();
    expect(quizResponseForKey(key("1", { repeat: true }), mcq)).toBeNull();
    expect(quizResponseForKey(key("1", { typing: true }), mcq)).toBeNull();
    expect(quizResponseForKey(key("0"), mcq)).toBeNull();
    expect(quizResponseForKey(key("Enter"), mcq)).toBeNull();
  });

  it("leaves digits to the text box for a typed question", () => {
    expect(quizResponseForKey(key("1"), typed)).toBeNull();
  });
});
