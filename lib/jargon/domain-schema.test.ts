import { describe, expect, it } from "vitest";
import { parseNewCollectionInput } from "./domain-schema";

describe("parseNewCollectionInput", () => {
  it.each([
    [
      { name: "Startup finance", language: "nl" },
      { ok: true, name: "Startup finance", language: "nl" },
    ],
    [
      { name: "  Padded  ", language: "en" },
      { ok: true, name: "Padded", language: "en" },
    ],
    [
      { name: "x", language: undefined },
      { ok: true, name: "x", language: "en" },
    ],
    [
      { name: "a".repeat(100), language: "en" },
      { ok: true, name: "a".repeat(100), language: "en" },
    ],
  ])("accepts %j", (input, expected) => {
    const result = parseNewCollectionInput(input);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.data).toEqual({ name: expected.name, language: expected.language });
  });

  it.each([
    [{ name: "", language: "en" }, "Enter a name for your collection."],
    [{ name: "   ", language: "en" }, "Enter a name for your collection."],
    [{ name: "a".repeat(101), language: "en" }, "Keep the name under 100 characters."],
  ])("rejects %j", (input, message) => {
    expect(parseNewCollectionInput(input)).toEqual({ ok: false, error: message });
  });

  it("rejects an unsupported language", () => {
    expect(parseNewCollectionInput({ name: "X", language: "fr" }).ok).toBe(false);
  });

  it("cleans control and override characters from the name", () => {
    const result = parseNewCollectionInput({ name: " Fi\u0000ne\u202E ", language: "en" });
    expect(result.ok && result.data.name).toBe("Fine");
  });
});
