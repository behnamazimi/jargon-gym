import { describe, expect, it } from "vitest";
import { countLabel, kindLine, parseKind } from "./kinds";

describe("parseKind", () => {
  it("keeps the two known kinds", () => {
    expect(parseKind("terms")).toBe("terms");
    expect(parseKind("vocabulary")).toBe("vocabulary");
  });

  it("falls back to terms for anything else", () => {
    expect(parseKind("slang")).toBe("terms");
    expect(parseKind("")).toBe("terms");
    expect(parseKind(null)).toBe("terms");
    expect(parseKind(undefined)).toBe("terms");
  });
});

describe("kindLine", () => {
  it("names field terms without a language", () => {
    expect(kindLine("terms", "en")).toBe("Field terms");
    expect(kindLine("terms", "nl")).toBe("Field terms");
  });

  it("names the language for words and phrases", () => {
    expect(kindLine("vocabulary", "nl")).toBe("Dutch words and phrases");
    expect(kindLine("vocabulary", "en")).toBe("English words and phrases");
  });
});

describe("countLabel", () => {
  it("counts terms", () => {
    expect(countLabel("terms", 1)).toBe("1 term");
    expect(countLabel("terms", 59)).toBe("59 terms");
  });

  it("counts words and phrases", () => {
    expect(countLabel("vocabulary", 1)).toBe("1 word or phrase");
    expect(countLabel("vocabulary", 50)).toBe("50 words and phrases");
  });
});
