import { describe, expect, it } from "vitest";
import { buildTimeline, sentenceAtFraction, sentenceBounds } from "./highlight";
import type { StorySegment } from "./types";

function sentenceTexts(segments: StorySegment[], language: "en" | "nl" = "en"): string[][] {
  return buildTimeline("Title", segments, language).paragraphs.map((paragraph) =>
    paragraph.map((sentence) => sentence.segments.map((segment) => segment.text).join("")),
  );
}

describe("buildTimeline", () => {
  it("splits a paragraph into sentences and keeps the spaces with the earlier one", () => {
    expect(sentenceTexts([{ text: "It rained. We stayed in. Tea helped." }])).toEqual([
      ["It rained. ", "We stayed in. ", "Tea helped."],
    ]);
  });

  it("keeps abbreviations inside a sentence", () => {
    expect(
      sentenceTexts([{ text: "Bring snacks, e.g. fruit, to the trip. Then we left." }]),
    ).toEqual([["Bring snacks, e.g. fruit, to the trip. ", "Then we left."]]);
  });

  it("splits Dutch text", () => {
    expect(sentenceTexts([{ text: "Het regende. We bleven binnen." }], "nl")).toEqual([
      ["Het regende. ", "We bleven binnen."],
    ]);
  });

  it("numbers sentences across paragraphs", () => {
    const { paragraphs } = buildTimeline("Title", [{ text: "One. Two.\n\nThree." }], "en");
    expect(paragraphs.map((paragraph) => paragraph.map((sentence) => sentence.index))).toEqual([
      [0, 1],
      [2],
    ]);
  });

  it("keeps a term whole and in its sentence", () => {
    const segments: StorySegment[] = [
      { text: "The " },
      { text: "load balancer. It", termId: "t1" },
      { text: " failed. Nobody noticed." },
    ];
    const [paragraph] = buildTimeline("Title", segments, "en").paragraphs;
    const termSentences = paragraph!.filter((sentence) =>
      sentence.segments.some((segment) => segment.termId),
    );
    expect(termSentences).toHaveLength(1);
    expect(termSentences[0]!.segments.find((segment) => segment.termId)!.text).toBe(
      "load balancer. It",
    );
    expect(paragraph!.map((sentence) => sentence.segments.map((s) => s.text).join(""))).toEqual([
      "The load balancer. It",
      " failed. ",
      "Nobody noticed.",
    ]);
  });

  it("ends every sentence later than the last and finishes at 1", () => {
    const { ends, titleEnd } = buildTimeline(
      "A title",
      [{ text: "One is short. Two is a little longer.\n\nThree closes." }],
      "en",
    );
    expect(ends).toHaveLength(3);
    expect(ends[0]!).toBeGreaterThan(titleEnd);
    expect(ends[1]!).toBeGreaterThan(ends[0]!);
    expect(ends[2]!).toBeGreaterThan(ends[1]!);
    expect(ends[2]!).toBeCloseTo(1);
  });

  it("gives a longer sentence a longer share", () => {
    const { ends, titleEnd } = buildTimeline(
      "T",
      [{ text: "Short. This one is quite a lot longer than the first." }],
      "en",
    );
    expect(ends[1]! - ends[0]!).toBeGreaterThan(ends[0]! - titleEnd);
  });

  it("has nothing to time for an empty story", () => {
    const timeline = buildTimeline("Title", [], "en");
    expect(timeline.paragraphs).toEqual([]);
    expect(timeline.ends).toEqual([]);
  });
});

describe("sentenceAtFraction", () => {
  const timeline = buildTimeline(
    "Title",
    [{ text: "First sentence here. Second sentence here.\n\nThird sentence here." }],
    "en",
  );

  it("shows nothing before the title has been read", () => {
    expect(sentenceAtFraction(timeline, 0)).toBeNull();
    expect(sentenceAtFraction(timeline, timeline.titleEnd / 2)).toBeNull();
  });

  it("starts at the first sentence once the title is done", () => {
    expect(sentenceAtFraction(timeline, timeline.titleEnd)).toBe(0);
  });

  it("finds the sentence around a point in the clip", () => {
    expect(sentenceAtFraction(timeline, (timeline.ends[0]! + timeline.ends[1]!) / 2)).toBe(1);
    expect(sentenceAtFraction(timeline, timeline.ends[1]! + 0.0001)).toBe(2);
  });

  it("stays on the last sentence at and after the end", () => {
    expect(sentenceAtFraction(timeline, 1)).toBe(2);
    expect(sentenceAtFraction(timeline, 1.5)).toBe(2);
  });

  it("shows nothing for a value that isn't a number", () => {
    expect(sentenceAtFraction(timeline, Number.NaN)).toBeNull();
    expect(sentenceAtFraction(timeline, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("shows nothing when there is nothing to time", () => {
    expect(sentenceAtFraction(buildTimeline("Title", [], "en"), 0.5)).toBeNull();
  });
});

describe("sentenceBounds", () => {
  const timeline = buildTimeline(
    "Title",
    [{ text: "First sentence here. Second sentence here.\n\nThird sentence here." }],
    "en",
  );

  it("starts the first sentence where the title ends", () => {
    expect(sentenceBounds(timeline, 0)).toEqual({
      start: timeline.titleEnd,
      end: timeline.ends[0],
    });
  });

  it("starts each later sentence where the one before ends", () => {
    expect(sentenceBounds(timeline, 1)).toEqual({ start: timeline.ends[0], end: timeline.ends[1] });
    expect(sentenceBounds(timeline, 2)).toEqual({ start: timeline.ends[1], end: 1 });
  });

  it("agrees with sentenceAtFraction inside every sentence", () => {
    for (const index of [0, 1, 2]) {
      const { start, end } = sentenceBounds(timeline, index)!;
      expect(sentenceAtFraction(timeline, (start + end) / 2)).toBe(index);
    }
  });

  it("has no bounds for a sentence that doesn't exist", () => {
    expect(sentenceBounds(timeline, 3)).toBeNull();
    expect(sentenceBounds(timeline, -1)).toBeNull();
    expect(sentenceBounds(buildTimeline("Title", [], "en"), 0)).toBeNull();
  });
});
