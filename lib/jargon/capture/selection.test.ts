import { describe, expect, it } from "vitest";
import { MAX_TERM_WORDS, termFromSelection, toggleChip, type Selection } from "./selection";
import { tokenize } from "./tokenize";

describe("toggleChip", () => {
  it.each<[string, Selection, number, Selection]>([
    ["first tap", null, 3, { start: 3, end: 3 }],
    ["tap the only word again", { start: 3, end: 3 }, 3, null],
    ["extend right", { start: 3, end: 4 }, 5, { start: 3, end: 5 }],
    ["extend left", { start: 3, end: 4 }, 2, { start: 2, end: 4 }],
    ["shrink from the left end", { start: 3, end: 5 }, 3, { start: 4, end: 5 }],
    ["shrink from the right end", { start: 3, end: 5 }, 5, { start: 3, end: 4 }],
    ["middle collapses to one", { start: 3, end: 5 }, 4, { start: 4, end: 4 }],
    ["jump starts a new run", { start: 3, end: 4 }, 9, { start: 9, end: 9 }],
  ])("%s", (_name, selection, index, expected) => {
    expect(toggleChip(selection, index)).toEqual(expected);
  });

  it("won't grow past the word cap", () => {
    const full = { start: 0, end: MAX_TERM_WORDS - 1 };
    expect(toggleChip(full, MAX_TERM_WORDS)).toEqual({
      start: MAX_TERM_WORDS,
      end: MAX_TERM_WORDS,
    });
  });
});

describe("termFromSelection", () => {
  const sentence = "We need to renegotiate the  SLA before the Q3 renewal.";
  const tokens = tokenize(sentence);

  it("keeps the original spacing inside the run", () => {
    expect(termFromSelection(sentence, tokens, { start: 4, end: 5 })).toBe("the  SLA");
  });

  it("is empty for indices outside the sentence", () => {
    expect(termFromSelection(sentence, tokens, { start: 50, end: 51 })).toBe("");
  });

  it("is empty without a selection", () => {
    expect(termFromSelection(sentence, tokens, null)).toBe("");
  });
});
