import { describe, expect, it } from "vitest";
import {
  answerResult,
  canSubmitAnswer,
  initialAnswerState,
  quizAnswerReducer,
} from "./quiz-question-state";

const response = { interaction: "choice" as const, optionIds: ["a"] };

describe("quizAnswerReducer", () => {
  it("cannot submit before a response", () => {
    expect(canSubmitAnswer(initialAnswerState)).toBe(false);
  });

  it("walks answering, locked, ready", () => {
    let state = quizAnswerReducer(initialAnswerState, { type: "RESPOND", response });
    expect(canSubmitAnswer(state)).toBe(true);
    state = quizAnswerReducer(state, { type: "SUBMIT", passed: true });
    expect(state).toMatchObject({ phase: "locked", passed: true });
    state = quizAnswerReducer(state, { type: "UNLOCK" });
    expect(state.phase).toBe("ready");
  });

  it("ignores responses and submits once locked", () => {
    const locked = quizAnswerReducer(
      quizAnswerReducer(initialAnswerState, { type: "RESPOND", response }),
      { type: "SUBMIT", passed: false },
    );
    expect(
      quizAnswerReducer(locked, {
        type: "RESPOND",
        response: { interaction: "choice", optionIds: ["b"] },
      }),
    ).toBe(locked);
    expect(quizAnswerReducer(locked, { type: "SUBMIT", passed: true })).toBe(locked);
  });

  it("only unlocks from locked", () => {
    expect(quizAnswerReducer(initialAnswerState, { type: "UNLOCK" })).toBe(initialAnswerState);
  });
});

describe("answerResult", () => {
  it("shows nothing before submission", () => {
    expect(answerResult(true, true, false)).toBe("default");
  });

  it("marks the correct option and a wrong selection", () => {
    expect(answerResult(true, false, true)).toBe("correct");
    expect(answerResult(false, true, true)).toBe("incorrect");
    expect(answerResult(false, false, true)).toBe("default");
  });
});
