import { describe, expect, it } from "vitest";
import { flattenParagraphs, toParagraphs } from "./paragraphs";

describe("flattenParagraphs / toParagraphs", () => {
  it("round-trips paragraphs, including terms at paragraph edges", () => {
    const paragraphs = [
      [{ text: "wij", termId: "t1" }, { text: " gaan." }],
      [{ text: "Hij komt " }, { text: "ook", termId: "t2" }],
    ];
    expect(toParagraphs(flattenParagraphs(paragraphs))).toEqual(paragraphs);
  });

  it("keeps the model's text exactly, including words split across segments", () => {
    const paragraph = [
      { text: "De " },
      { text: "API", termId: "t1" },
      { text: "s zijn klaar.Niemand weet het." },
    ];
    expect(toParagraphs(flattenParagraphs([paragraph]))).toEqual([paragraph]);
  });

  it("treats a blank line the model wrote inside a paragraph as its own break", () => {
    const flat = flattenParagraphs([[{ text: "Eerste deel.\n\nTweede deel." }]]);
    expect(toParagraphs(flat)).toEqual([[{ text: "Eerste deel." }], [{ text: "Tweede deel." }]]);
  });
});
