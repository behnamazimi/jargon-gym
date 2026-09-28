import { describe, expect, it } from "vitest";
import { quizChoiceForKey } from "./keyboard";
import type { QuizQuestion } from "./types";

const mcq: QuizQuestion = {
  type: "multiple_choice",
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
  type: "true_false",
  termId: "t",
  prompt: "True?",
  correctAnswer: true,
};

const key = (value: string, extra = {}) => ({ key: value, typing: false, ...extra });

describe("quizChoiceForKey", () => {
  it("maps digits to options in display order", () => {
    expect(quizChoiceForKey(key("1"), mcq)).toEqual({ type: "multiple_choice", optionId: "a" });
    expect(quizChoiceForKey(key("3"), mcq)).toEqual({ type: "multiple_choice", optionId: "c" });
  });

  it("ignores digits past the last option", () => {
    expect(quizChoiceForKey(key("4"), mcq)).toBeNull();
    expect(quizChoiceForKey(key("3"), trueFalse)).toBeNull();
  });

  it("maps 1 to True and 2 to False", () => {
    expect(quizChoiceForKey(key("1"), trueFalse)).toEqual({ type: "true_false", value: true });
    expect(quizChoiceForKey(key("2"), trueFalse)).toEqual({ type: "true_false", value: false });
  });

  it("ignores modified, held, typed and non-digit keys", () => {
    expect(quizChoiceForKey(key("1", { metaKey: true }), mcq)).toBeNull();
    expect(quizChoiceForKey(key("1", { ctrlKey: true }), mcq)).toBeNull();
    expect(quizChoiceForKey(key("1", { repeat: true }), mcq)).toBeNull();
    expect(quizChoiceForKey(key("1", { typing: true }), mcq)).toBeNull();
    expect(quizChoiceForKey(key("0"), mcq)).toBeNull();
    expect(quizChoiceForKey(key("Enter"), mcq)).toBeNull();
  });
});
