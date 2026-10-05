import { describe, expect, it } from "vitest";
import { isInsideDialog } from "./in-dialog";

function elementIn(selectors: string[]) {
  return { closest: (selector: string) => (selectors.includes(selector) ? {} : null) };
}

describe("isInsideDialog", () => {
  const selector = "[role='dialog'], [role='alertdialog']";

  it("is true for an element inside a dialog", () => {
    expect(isInsideDialog(elementIn([selector]) as unknown as EventTarget)).toBe(true);
  });

  it("is false for an element outside any dialog", () => {
    expect(isInsideDialog(elementIn([]) as unknown as EventTarget)).toBe(false);
  });

  it("is false for the window or no target", () => {
    expect(isInsideDialog(null)).toBe(false);
    expect(isInsideDialog({} as EventTarget)).toBe(false);
  });
});
