import { describe, expect, it } from "vitest";
import { StoryGenerationError } from "./errors";
import { normalizeStory as normalizeWithLength, surfaceMatchesTerm } from "./normalize";

const TERMS = [
  { id: "t1", term: "Idempotency", definition: "d" },
  { id: "t2", term: "Circuit breaker", definition: "d" },
  { id: "t3", term: "Backpressure", definition: "d" },
  { id: "t4", term: "Sharding", definition: "d" },
];

const LENGTH = { min: 70, max: 120, unit: "words" as const };

type NormalizeArgs = Parameters<typeof normalizeWithLength>;

function normalizeStory(payload: NormalizeArgs[0], terms: NormalizeArgs[1]) {
  return normalizeWithLength(payload, terms, LENGTH);
}

const FILLER = Array.from({ length: 90 }, (_, index) => `word${index}`).join(" ");

function payload(segments: { text: string; termId?: string }[]) {
  return {
    title: "  A title ",
    paragraphs: [{ segments: [...segments, { text: ` ${FILLER}.` }] }],
  };
}

describe("surfaceMatchesTerm", () => {
  it("accepts inflected forms", () => {
    expect(surfaceMatchesTerm("idempotent", "Idempotency")).toBe(true);
    expect(surfaceMatchesTerm("circuit breakers", "Circuit breaker")).toBe(true);
  });

  it("rejects unrelated words", () => {
    expect(surfaceMatchesTerm("the retry", "Idempotency")).toBe(false);
    expect(surfaceMatchesTerm("circuit", "Circuit breaker")).toBe(false);
  });
});

describe("normalizeStory", () => {
  it("keeps matching term segments and reports the terms used", () => {
    const result = normalizeStory(
      payload([
        { text: "Retries need " },
        { text: "idempotency", termId: "t1" },
        { text: ", a " },
        { text: "circuit breaker", termId: "t2" },
        { text: " and " },
        { text: "backpressure", termId: "t3" },
      ]),
      TERMS,
    );
    expect(result.title).toBe("A title");
    expect(result.termIds).toEqual(["t1", "t2", "t3"]);
    expect(result.segments[1]).toEqual({ text: "idempotency", termId: "t1" });
  });

  it("turns unknown ids and mismatched text into plain text", () => {
    const result = normalizeStory(
      payload([
        { text: "idempotency", termId: "t1" },
        { text: " x ", termId: "nope" },
        { text: "sharded", termId: "t4" },
        { text: " and " },
        { text: "the network", termId: "t2" },
        { text: " with " },
        { text: "backpressure", termId: "t3" },
      ]),
      TERMS,
    );
    expect(result.termIds).toEqual(["t1", "t3", "t4"]);
    expect(result.segments.some((segment) => segment.text.includes("the network"))).toBe(true);
    expect(result.segments.every((segment) => segment.termId !== "nope")).toBe(true);
  });

  it("merges adjacent plain segments and splits whitespace off terms", () => {
    const result = normalizeStory(
      payload([
        { text: "a " },
        { text: "b " },
        { text: " idempotency ", termId: "t1" },
        { text: "sharding", termId: "t4" },
        { text: "backpressure", termId: "t3" },
      ]),
      TERMS,
    );
    expect(result.segments.slice(0, 2)).toEqual([
      { text: "a b  " },
      { text: "idempotency", termId: "t1" },
    ]);
    expect(result.segments[2]).toEqual({ text: " " });
  });

  it("counts a repeated term once", () => {
    const result = normalizeStory(
      payload([
        { text: "idempotency", termId: "t1" },
        { text: " and " },
        { text: "idempotent", termId: "t1" },
        { text: " " },
        { text: "sharding", termId: "t4" },
        { text: " " },
        { text: "backpressure", termId: "t3" },
      ]),
      TERMS,
    );
    expect(result.termIds).toEqual(["t1", "t3", "t4"]);
  });

  it("rejects a story with fewer than three terms", () => {
    expect(() =>
      normalizeStory(
        payload([
          { text: "idempotency", termId: "t1" },
          { text: " " },
          { text: "sharding", termId: "t4" },
        ]),
        TERMS,
      ),
    ).toThrow(StoryGenerationError);
  });

  it("rejects a story that is too short", () => {
    expect(() =>
      normalizeStory(
        {
          title: "t",
          paragraphs: [
            {
              segments: [
                { text: "idempotency", termId: "t1" },
                { text: " " },
                { text: "sharding", termId: "t4" },
                { text: " " },
                { text: "backpressure", termId: "t3" },
              ],
            },
          ],
        },
        TERMS,
      ),
    ).toThrow(/words/);
  });

  it("rejects a story that is too long", () => {
    const longFiller = Array.from({ length: 220 }, (_, index) => `word${index}`).join(" ");
    expect(() =>
      normalizeStory(
        {
          title: "t",
          paragraphs: [
            {
              segments: [
                { text: "idempotency", termId: "t1" },
                { text: " " },
                { text: "sharding", termId: "t4" },
                { text: " " },
                { text: "backpressure", termId: "t3" },
                { text: ` ${longFiller}` },
              ],
            },
          ],
        },
        TERMS,
      ),
    ).toThrow(/words/);
  });

  it("joins paragraphs with a blank line", () => {
    const result = normalizeStory(
      {
        title: "t",
        paragraphs: [
          { segments: [{ text: "First " }, { text: "idempotency", termId: "t1" }, { text: ". " }] },
          { segments: [{ text: " Then " }, { text: "sharding", termId: "t4" }, { text: "." }] },
          { segments: [{ text: "backpressure", termId: "t3" }, { text: ` ${FILLER}` }] },
        ],
      },
      TERMS,
    );
    expect(result.segments.slice(0, 5)).toEqual([
      { text: "First " },
      { text: "idempotency", termId: "t1" },
      { text: ".\n\nThen " },
      { text: "sharding", termId: "t4" },
      { text: ".\n\n" },
    ]);
  });

  it("keeps the model's paragraphs as written", () => {
    const sentences = Array.from({ length: 10 }, (_, index) => `Sentence ${index}.`).join(" ");
    const result = normalizeStory(
      {
        title: "t",
        paragraphs: [
          {
            segments: [
              { text: "idempotency", termId: "t1" },
              { text: " and " },
              { text: "sharding", termId: "t4" },
              { text: " and " },
              { text: "backpressure", termId: "t3" },
              { text: `. ${sentences} ${FILLER}` },
            ],
          },
        ],
      },
      TERMS,
    );
    const text = result.segments.map((segment) => segment.text).join("");
    expect(text).not.toContain("\n");
  });

  it("saves the model's text exactly as written, slips included", () => {
    const written = [
      { text: "Ze zei: \u201cDe " },
      { text: "idempotency", termId: "t1" },
      { text: "s zijn klaar.Niemand weet het,\u201d en ging. De " },
      { text: "sharding", termId: "t4" },
      { text: " en " },
      { text: "backpressure", termId: "t3" },
      { text: ` blijven. ${FILLER}` },
    ];
    const result = normalizeStory({ title: "t", paragraphs: [{ segments: written }] }, TERMS);
    expect(result.segments.map((segment) => segment.text).join("")).toBe(
      written.map((segment) => segment.text).join(""),
    );
  });

  it("rejects a missing title", () => {
    expect(() => normalizeStory({ ...payload([]), title: "  " }, TERMS)).toThrow(
      StoryGenerationError,
    );
  });

  it("checks the length against the asked-for range", () => {
    const story = payload([
      { text: "idempotency", termId: "t1" },
      { text: " " },
      { text: "sharding", termId: "t4" },
      { text: " " },
      { text: "backpressure", termId: "t3" },
    ]);
    // 93 words: inside 0.6 × 70 to 1.3 × 120, outside a longer asked-for range.
    expect(() => normalizeWithLength(story, TERMS, LENGTH)).not.toThrow();
    expect(() => normalizeWithLength(story, TERMS, { min: 200, max: 260, unit: "words" })).toThrow(
      /93 words/,
    );
  });
});
