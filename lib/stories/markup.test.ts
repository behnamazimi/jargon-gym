import { describe, expect, it } from "vitest";
import { parseStoryText } from "./markup";
import { StoryGenerationError } from "./normalize";

const TERMS = [
  { id: "t1", term: "Idempotency", definition: "d" },
  { id: "t2", term: "Sharding", definition: "d" },
];

describe("parseStoryText", () => {
  it("reads the title and the model's own paragraphs", () => {
    const result = parseStoryText("Title: The outage\n\nFirst one. Second.\n\nThird.", TERMS);
    expect(result.title).toBe("The outage");
    expect(result.paragraphs).toEqual([
      { segments: [{ text: "First one. Second." }] },
      { segments: [{ text: "Third." }] },
    ]);
  });

  it("turns markers into term segments and keeps the text around them exactly", () => {
    const result = parseStoryText("# Title\n\nWe [[sharded|2]] it.Then [[idempotent|1]]!", TERMS);
    expect(result.title).toBe("Title");
    expect(result.paragraphs[0].segments).toEqual([
      { text: "We " },
      { text: "sharded", termId: "t2" },
      { text: " it.Then " },
      { text: "idempotent", termId: "t1" },
      { text: "!" },
    ]);
  });

  it("keeps the words of a marker with an unknown or missing number as plain text", () => {
    const result = parseStoryText("Title\n\nA [[shard|9]] and [[retry]].", TERMS);
    expect(result.paragraphs[0].segments).toEqual([
      { text: "A " },
      { text: "shard" },
      { text: " and " },
      { text: "retry" },
      { text: "." },
    ]);
  });

  it("drops markers and bold from the title", () => {
    expect(parseStoryText("**On [[sharding|2]]**\n\nText.", TERMS).title).toBe("On sharding");
  });
});

describe("parseStoryText edge cases", () => {
  it("takes the title from the line after a bare 'Title:'", () => {
    const result = parseStoryText("Title:\nThe outage\n\nIt [[sharded|2]].", TERMS);
    expect(result.title).toBe("The outage");
    expect(result.paragraphs).toHaveLength(1);
  });

  it("ignores a code fence around the whole reply", () => {
    const result = parseStoryText("```text\nThe outage\n\nIt [[sharded|2]].\n```", TERMS);
    expect(result.title).toBe("The outage");
    expect(result.paragraphs).toEqual([
      { segments: [{ text: "It " }, { text: "sharded", termId: "t2" }, { text: "." }] },
    ]);
  });

  it("reads CRLF replies like LF ones", () => {
    const result = parseStoryText("Title\r\n\r\nOne.\r\nTwo.\r\n\r\nThree.", TERMS);
    expect(result.paragraphs).toEqual([
      { segments: [{ text: "One.\nTwo." }] },
      { segments: [{ text: "Three." }] },
    ]);
  });

  it("accepts spaces and a # or 'term' before the number", () => {
    const result = parseStoryText("T\n\n[[a | 1 ]] [[b|#2]] [[c|term 1]]", TERMS);
    const termIds = result.paragraphs[0].segments.map((segment) => segment.termId);
    expect(termIds).toEqual(["t1", undefined, "t2", undefined, "t1"]);
  });

  it("returns an empty piece for a title-only reply", () => {
    expect(parseStoryText("Just a title", TERMS)).toEqual({
      title: "Just a title",
      paragraphs: [],
    });
  });

  it.each([
    ["number first", "T\n\nWe [[2|shards]] it."],
    ["missing bracket", "T\n\nWe [[shards|2] it."],
    ["triple brackets", "T\n\nWe [[[shards|2]]] it."],
    ["marker across a line", "T\n\nWe [[shard\ning|2]] it."],
    ["marker across paragraphs", "T\n\nWe [[shard\n\ning|2]] it."],
    ["marker in the title", "[[On|2]\n\nText."],
  ])("rejects a broken marker: %s", (_name, reply) => {
    expect(() => parseStoryText(reply, TERMS)).toThrow(StoryGenerationError);
  });
});
