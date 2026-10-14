import { describe, expect, it } from "vitest";
import { containsWholeWord, MASK, maskWord, maskWords, namesTerm } from "./mask";

describe("maskWord", () => {
  it("blanks whole words, case-insensitively", () => {
    expect(maskWord("Blocked means blocked.", "blocked")).toBe(`${MASK} means ${MASK}.`);
  });

  it("leaves words that merely contain the term", () => {
    expect(maskWord("The unblocked path", "blocked")).toBe("The unblocked path");
    expect(maskWord("Wat een gezellige avond!", "gezellig")).toBe("Wat een gezellige avond!");
  });

  it("handles multi-word terms and punctuation in the term", () => {
    expect(maskWord("Ik zie het licht aan.", "het licht")).toBe(`Ik zie ${MASK} aan.`);
    expect(maskWord("It costs (a lot).", "(a lot)")).toBe(`It costs ${MASK}.`);
  });

  it("treats accented letters as word characters", () => {
    expect(maskWord("een café en cafés", "café")).toBe(`een ${MASK} en cafés`);
  });

  it("returns the text untouched for a blank term", () => {
    expect(maskWord("anything", "  ")).toBe("anything");
  });
});

describe("maskWords", () => {
  it("masks every given word", () => {
    expect(maskWords("Spike and velocity", ["spike", "velocity"])).toBe(`${MASK} and ${MASK}`);
  });
});

describe("containsWholeWord", () => {
  it("matches whole words only", () => {
    expect(containsWholeWord("Je komt toch?", "toch")).toBe(true);
    expect(containsWholeWord("Het is lopen", "loop")).toBe(false);
    expect(containsWholeWord("Ik loop elke dag", "lopen")).toBe(false);
  });

  it("is false for a blank term", () => {
    expect(containsWholeWord("text", "")).toBe(false);
  });
});

describe("namesTerm", () => {
  it("finds the term with or without its leading article, in any case", () => {
    expect(namesTerm("In ieder geval kom ik morgen.", "het geval", "nl")).toBe(true);
    expect(namesTerm("In ieder geval kom ik morgen.", "Het geval", "nl")).toBe(true);
    expect(namesTerm("Ik zie het licht aan.", "het licht", "nl")).toBe(true);
    expect(namesTerm("I'm blocked by a blocker.", "Blocker", "en")).toBe(true);
    expect(namesTerm("Rates went up.", "The rate", "en")).toBe(false);
    expect(namesTerm("The rate went up.", "The rate", "en")).toBe(true);
  });

  it("only strips real articles", () => {
    expect(namesTerm("The rate went up.", "run rate", "en")).toBe(false);
    expect(namesTerm("We set the table.", "cap table", "en")).toBe(false);
    expect(namesTerm("A task that is simply large.", "Blocker", "en")).toBe(false);
  });
});
