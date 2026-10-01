import { describe, expect, it } from "vitest";
import { parseTermInput } from "./term-schema";

describe("parseTermInput", () => {
  it("removes control and override characters", () => {
    const result = parseTermInput({
      term: " AP\u0000I ",
      definition: "a\u202E way",
      example: "e\u0007",
    });
    expect(result.ok && result.data).toMatchObject({
      term: "API",
      definition: "a way",
      example: "e",
    });
  });

  it("treats a term of only control characters as empty", () => {
    const result = parseTermInput({ term: "\u0000" });
    expect(!result.ok && result.error).toBe("Enter a term");
  });

  it("still makes blank optional fields null", () => {
    const result = parseTermInput({ term: "API", definition: "  ", category: "" });
    expect(result.ok && result.data).toMatchObject({ definition: null, category: null });
  });
});
