import { describe, expect, it } from "vitest";
import { previewStory } from "./preview";

describe("previewStory", () => {
  it("splits the title from the paragraphs", () => {
    expect(previewStory("A Day\n\nFirst paragraph.\n\nSecond one.")).toEqual({
      title: "A Day",
      paragraphs: ["First paragraph.", "Second one."],
    });
  });

  it("shows only the words of a marker", () => {
    const { paragraphs } = previewStory("Title\n\nWe ship [[retries|1]] and [[ idempotency |2]].");
    expect(paragraphs).toEqual(["We ship retries and  idempotency ."]);
  });

  it("hides a marker that is still being written", () => {
    for (const tail of ["[", "[[ret", "[[retries|", "[[retries|1]"]) {
      expect(previewStory(`Title\n\nWe ship ${tail}`).paragraphs).toEqual(["We ship"]);
    }
  });

  it("copes with a reply that has only started", () => {
    expect(previewStory("")).toEqual({ title: "", paragraphs: [] });
    expect(previewStory("A Da")).toEqual({ title: "A Da", paragraphs: [] });
  });
});
