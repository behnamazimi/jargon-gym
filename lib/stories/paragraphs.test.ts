import { describe, expect, it } from "vitest";
import { flattenParagraphs, spaceRunOnWords, toParagraphs } from "./paragraphs";

function text(segments: { text: string }[]) {
  return segments.map((segment) => segment.text).join("");
}

describe("spaceRunOnWords", () => {
  it("separates two terms that arrive with nothing between them", () => {
    const result = spaceRunOnWords([
      { text: "de last. " },
      { text: "Als", termId: "t1" },
      { text: "dit", termId: "t2" },
      { text: " wordt" },
    ]);
    expect(text(result)).toBe("de last. Als dit wordt");
    expect(result.filter((segment) => segment.termId)).toHaveLength(2);
  });

  it("adds the space after a sentence end at a segment boundary", () => {
    expect(text(spaceRunOnWords([{ text: "de last." }, { text: "Als", termId: "t1" }]))).toBe(
      "de last. Als",
    );
  });

  it("splits a sentence run into the next one inside plain text", () => {
    expect(text(spaceRunOnWords([{ text: "een bleek gezicht.Niemand mag" }]))).toBe(
      "een bleek gezicht. Niemand mag",
    );
  });

  it("leaves correct text, punctuation, and abbreviations alone", () => {
    const input = [
      { text: "Hij zei " },
      { text: "ook", termId: "t1" },
      { text: ", in de U.S. en om 3.5 uur." },
    ];
    expect(text(spaceRunOnWords(input))).toBe("Hij zei ook, in de U.S. en om 3.5 uur.");
  });
});

describe("flattenParagraphs / toParagraphs", () => {
  it("round-trips paragraphs, including terms at paragraph edges", () => {
    const paragraphs = [
      [{ text: "wij", termId: "t1" }, { text: " gaan." }],
      [{ text: "Hij komt " }, { text: "ook", termId: "t2" }],
    ];
    expect(toParagraphs(flattenParagraphs(paragraphs))).toEqual(paragraphs);
  });
});
