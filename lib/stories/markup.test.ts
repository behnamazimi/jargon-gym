import { describe, expect, it } from "vitest";
import { parseStoryText } from "./markup";

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
