import { describe, expect, it } from "vitest";
import { AGAIN, EASY } from "@/lib/trace";
import { canMoveForward, reviewKeyAction, type ReviewKeyInput } from "./keyboard";

const hidden = { revealed: false, rated: false };
const revealed = { revealed: true, rated: false };
const revisited = { revealed: true, rated: true };

function key(value: string, extra: Partial<ReviewKeyInput> = {}): ReviewKeyInput {
  return { key: value, target: "other", ...extra };
}

describe("canMoveForward", () => {
  it("allows skipping a hidden card and leaving a graded one", () => {
    expect(canMoveForward(hidden)).toBe(true);
    expect(canMoveForward(revisited)).toBe(true);
  });

  it("blocks leaving a revealed card that isn't graded", () => {
    expect(canMoveForward(revealed)).toBe(false);
  });
});

describe("reviewKeyAction", () => {
  it.each([" ", "Enter"])("reveals a hidden card with %j", (value) => {
    expect(reviewKeyAction(key(value), hidden)).toEqual({ type: "reveal" });
  });

  it.each([" ", "Enter"])("does nothing with %j once revealed", (value) => {
    expect(reviewKeyAction(key(value), revealed)).toEqual({ type: "consume" });
    expect(reviewKeyAction(key(value), revisited)).toEqual({ type: "consume" });
  });

  it("ignores a held-down Enter instead of revealing", () => {
    expect(reviewKeyAction(key("Enter", { repeat: true }), hidden)).toEqual({ type: "consume" });
  });

  it("grades with 1-4 only after reveal", () => {
    expect(reviewKeyAction(key("1"), revealed)).toEqual({ type: "grade", grade: AGAIN });
    expect(reviewKeyAction(key("4"), revisited)).toEqual({ type: "grade", grade: EASY });
    expect(reviewKeyAction(key("1"), hidden)).toEqual({ type: "ignore" });
  });

  it("ignores repeated grade keys", () => {
    expect(reviewKeyAction(key("3", { repeat: true }), revealed)).toEqual({ type: "ignore" });
  });

  it("skips forward before reveal but not after", () => {
    expect(reviewKeyAction(key("ArrowRight"), hidden)).toEqual({ type: "next" });
    expect(reviewKeyAction(key("ArrowRight"), revealed)).toEqual({ type: "ignore" });
    expect(reviewKeyAction(key("ArrowRight"), revisited)).toEqual({ type: "next" });
  });

  it("always allows going back", () => {
    expect(reviewKeyAction(key("ArrowLeft"), revealed)).toEqual({ type: "previous" });
  });

  it.each(["metaKey", "ctrlKey", "altKey"] as const)("ignores shortcuts with %s", (modifier) => {
    expect(reviewKeyAction(key("1", { [modifier]: true }), revealed)).toEqual({ type: "ignore" });
    expect(reviewKeyAction(key("Enter", { [modifier]: true }), hidden)).toEqual({
      type: "ignore",
    });
  });

  it("leaves every key to text fields", () => {
    expect(reviewKeyAction(key("Enter", { target: "editable" }), hidden)).toEqual({
      type: "ignore",
    });
    expect(reviewKeyAction(key("2", { target: "editable" }), revealed)).toEqual({
      type: "ignore",
    });
  });

  it("leaves Space/Enter to a focused button but still grades", () => {
    expect(reviewKeyAction(key("Enter", { target: "interactive" }), hidden)).toEqual({
      type: "ignore",
    });
    expect(reviewKeyAction(key("2", { target: "interactive" }), revealed)).toMatchObject({
      type: "grade",
    });
  });
});
