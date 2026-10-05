import { describe, expect, it } from "vitest";
import { truncateAtWord } from "./truncate";

describe("truncateAtWord", () => {
  it("leaves short text alone", () => {
    expect(truncateAtWord("  a short one ", 20)).toBe("a short one");
  });

  it("cuts at a word boundary and adds an ellipsis", () => {
    expect(truncateAtWord("one two three four", 10)).toBe("one two…");
  });

  it("cuts mid-word only when there is no space to cut at", () => {
    expect(truncateAtWord("abcdefghijkl", 5)).toBe("abcde…");
  });
});
