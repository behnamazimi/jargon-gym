import { describe, expect, it } from "vitest";
import { buildStoryScript } from "./script";

describe("buildStoryScript", () => {
  it("ends the title like a sentence and joins the body", () => {
    expect(
      buildStoryScript({
        title: " A quiet day ",
        segments: [{ text: "She " }, { text: "slept." }],
      }),
    ).toBe("A quiet day.\n\nShe slept.");
  });

  it("keeps a title that already ends a sentence", () => {
    expect(buildStoryScript({ title: "Why?", segments: [{ text: "Because." }] })).toBe(
      "Why?\n\nBecause.",
    );
  });
});
